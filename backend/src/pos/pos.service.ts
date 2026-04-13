import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { LimitsService } from '../limits/limits.service';
import * as bcrypt from 'bcryptjs';
// Importamos los Enums y tipos correctos
import { TransactionStatus, TransactionType, PaymentMethod, Prisma } from '@prisma/client';
import { Role } from '../auth/roles.enum';
import { PayDto } from './dto/pay.dto';
import { AddItemDto } from './dto/add-item.dto';
import { VoidDto } from './dto/void.dto';
import { CreditByCardDto } from './dto/pos.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ChargeBalanceDto } from './dto/charge-balance.dto';
import { ConfigService } from '@nestjs/config';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { ArcaService } from '../arca/arca.service';

// Helper de tiempo
type JwtExpires = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;
function parseExpiresToMs(expr: string): number {
    const m = /^(\d+)(ms|s|m|h|d|w|y)$/.exec(expr);
    if (!m) return 30 * 60_000;
    const n = Number(m[1]);
    switch (m[2]) {
        case 'ms': return n;
        case 's': return n * 1000;
        case 'm': return n * 60_000;
        default: return 30 * 60_000;
    }
}

@Injectable()
export class PosService {
    private readonly logger = new Logger(PosService.name);

    constructor(
        private prisma: PrismaService,
        private accounts: AccountsService,
        private jwt: JwtService,
        private limits: LimitsService,
        private purchaseOrders: PurchaseOrdersService,
        private notifications: NotificationsService,
        private mp: MercadoPagoService,
        private configService: ConfigService,
        private arca: ArcaService,
    ) { }

    // ===================================================================
    // AUTH (Login Kiosco/Cajero)
    // ===================================================================

    async issueKioskToken(kiosk: { id: number; schoolId: number; ownerId: number }) {
        const jti = randomUUID();
        const payload = { kind: 'kiosk' as const, kioskId: kiosk.id, schoolId: kiosk.schoolId, ownerId: kiosk.ownerId };

        const expiresIn = (process.env.KIOSK_JWT_EXPIRES_IN ?? '30m') as JwtExpires;

        const kiosk_token = await this.jwt.signAsync(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: expiresIn,
            jwtid: jti,
        });

        const ms = parseExpiresToMs(expiresIn);
        const expiresAt = new Date(Date.now() + ms);

        await this.prisma.kioskSession.create({
            data: { kioskId: kiosk.id, jti, expiresAt },
        });

        return { kiosk_token, kioskId: kiosk.id, schoolId: kiosk.schoolId, expiresAt };
    }

    async cashierLogin(kioskId: number, email: string, password: string) {
        this.logger.log(`Cashier login attempt on Kiosk #${kioskId}`);

        const kiosk = await this.prisma.kiosk.findUnique({ where: { id: kioskId } });
        if (!kiosk) {
            throw new NotFoundException('Kiosk not found');
        }

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.schoolId !== kiosk.schoolId) {
            throw new ForbiddenException('User is not authorized for this kiosk (school mismatch)');
        }

        const userRoles = user.roles.map((ur: any) => ur.role.name);
        const isAuthorizedRole = userRoles.includes(Role.CASHIER) || userRoles.includes(Role.ADMIN) || userRoles.includes(Role.ENCARGADO);

        if (!isAuthorizedRole) {
            throw new BadRequestException('User role is not authorized for POS login');
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            throw new BadRequestException('Invalid credentials');
        }

        this.logger.log(`Cashier login successful on Kiosk #${kioskId}`);
        const jti = randomUUID();
        const payload = {
            kind: 'cashier' as const,
            kioskId,
            userId: user.id,
            schoolId: kiosk.schoolId,
            ownerId: kiosk.ownerId, // <-- Añadido
            roles: userRoles,
            sub: user.id,
            email: user.email,
        };

        const expiresIn = (process.env.KIOSK_JWT_EXPIRES_IN ?? '30m') as JwtExpires;
        const cashier_token = await this.jwt.signAsync(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn,
            jwtid: jti,
        });

        const ms = parseExpiresToMs(expiresIn);
        const expiresAt = new Date(Date.now() + ms);

        await this.prisma.kioskSession.create({
            data: {
                kioskId,
                jti,
                expiresAt,
                cashierUserId: user.id,
            },
        });

        return {
            cashier_token, kioskId, userId: user.id, schoolId: kiosk.schoolId, ownerId: kiosk.ownerId, expiresAt, name: user.name,
            roles: userRoles
        };

    }

    async revokeCurrentSession(jti: string, kioskId: number, reason?: string) {
        try {
            await this.prisma.kioskSession.update({
                where: { jti },
                data: { revokedAt: new Date(), reason },
            });
        } catch { }
    }

    async revokeAllSessions(kioskId: number) {
        await this.prisma.kioskSession.updateMany({
            where: { kioskId, revokedAt: null },
            data: { revokedAt: new Date(), reason: 'logout-all' },
        });
    }

    // ===================================================================
    // VENTA V2 (CORE)
    // ===================================================================

    /**
     * Paso 1: Crear Carrito (Transaction PENDING)
     */
    async createPendingTransaction(cashierId: number, terminalId: number, ownerId: number, childId?: number) {
        // 1. Validar Sesión de Caja
        const session = await this.prisma.cashSession.findFirst({
            where: { cashierId, terminalId, closedAt: null },
        });

        if (!session) {
            throw new BadRequestException('El cajero no tiene una sesión de caja abierta.');
        }

        // 2. Buscar Cuenta del Alumno (Si aplica)
        let accountId: number | undefined = undefined;
        if (childId) {
            const account = await this.prisma.account.findUnique({
                where: { childId_ownerId: { childId, ownerId } }, // <-- Filtro por dueño
                select: { id: true, child: { select: { isActive: true } } }
            });


            if (!account) throw new NotFoundException(`Cuenta no encontrada...`);

            // --- VALIDACIÓN NUEVA ---
            if (!account.child.isActive) {
                throw new BadRequestException('El alumno está inactivo/eliminado.');
            }
            // ------------------------

            accountId = account.id;
        }

        // 3. Crear Transacción
        // ¡AQUÍ ESTABA EL BUG POTENCIAL! Nos aseguramos de usar PaymentMethod válido.
        return this.prisma.transaction.create({
            data: {
                type: TransactionType.SALE,
                status: TransactionStatus.PENDING,
                // Si hay cuenta, pre-seleccionamos CARD. Si no, CASH. Nunca 'UNKNOWN'.
                paymentMethod: accountId ? PaymentMethod.CARD : PaymentMethod.CASH,
                subTotalCents: 0,
                taxCents: 0,
                totalCents: 0,
                ownerId,
                cashierId: cashierId,
                terminalId: terminalId,
                accountId: accountId,
            },
        });
    }

    /**
     * Paso 2: Agregar Items
     */
    async addTransactionItem(
        transactionId: number,
        dto: AddItemDto,
        terminalId: number,
        userRole: Role,
    ) {
        let unitPriceCents = 0;
        let description = dto.description ?? 'Producto';
        let taxRate = 0;

        const transaction = await this.prisma.transaction.findFirst({
            where: {
                id: transactionId,
                terminalId: terminalId,
                status: TransactionStatus.PENDING,
            },
        });

        if (!transaction) throw new NotFoundException(`Transacción pendiente ${transactionId} no encontrada.`);

        if (dto.productId) {
            const product = await this.prisma.product.findFirst({
                where: { id: dto.productId, isActive: true, ownerId: transaction.ownerId as number }, // <-- Isolation
            });

            if (!product) throw new BadRequestException(`Producto ${dto.productId} no encontrado.`);
            description = product.name;
            unitPriceCents = product.priceCents;

        } else if (dto.overridePriceCents !== undefined && dto.description) {
            if (userRole !== Role.ADMIN && userRole !== Role.ENCARGADO) {
                throw new ForbiddenException('Tu rol no tiene permisos para precios manuales.');
            }
            unitPriceCents = dto.overridePriceCents;
            description = dto.description;
        } else {
            throw new BadRequestException('Debe proveer productId o descripción manual.');
        }

        const totalLineCents = unitPriceCents * dto.quantity;

        try {
            const [_, updatedTransaction] = await this.prisma.$transaction([
                this.prisma.transactionItem.create({
                    data: {
                        transactionId: transaction.id,
                        productId: dto.productId,
                        description: description,
                        quantity: dto.quantity,
                        unitPriceCents: unitPriceCents,
                        overridePriceCents: dto.overridePriceCents,
                        taxRate: taxRate,
                        totalLineCents: totalLineCents,
                    },
                }),
                this.prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        subTotalCents: { increment: totalLineCents },
                        totalCents: { increment: totalLineCents },
                    },
                }),
            ]);
            return updatedTransaction;
        } catch (e) {
            console.error(e);
            throw new BadRequestException('No se pudo agregar el ítem.', { cause: e });
        }
    }

    /**
     * Paso 3: Pagar
     */
    async payForTransaction(transactionId: number, dto: PayDto, cashierId: number, terminalId: number) {
        const result = await this.prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findFirst({
                where: { id: transactionId, terminalId, status: TransactionStatus.PENDING },
                include: { items: { include: { product: true } } },
            });

            if (!transaction) throw new NotFoundException('Transacción no encontrada.');
            if (transaction.totalCents === 0) throw new BadRequestException('Carrito vacío.');

            const existingPaid = await tx.transaction.findFirst({ where: { externalRef: dto.idempotencyKey, status: TransactionStatus.PAID } });
            if (existingPaid) return existingPaid;

            if (dto.paymentMethod === PaymentMethod.CARD) {
                if (!transaction.accountId) throw new BadRequestException('Venta no asociada a alumno.');

                const account = await tx.account.findUnique({
                    where: { id: transaction.accountId as number },
                    select: { balanceCents: true, childId: true, creditLimitCents: true }
                });
                if (!account) throw new NotFoundException('Cuenta de alumno no encontrada.');

                // Lógica de Deuda: Saldo + Límite
                const availableFunds = account.balanceCents + (account.creditLimitCents || 0);

                if (availableFunds < transaction.totalCents) {
                    throw new BadRequestException(
                        `Saldo insuficiente. Tienes: $${account.balanceCents / 100}, ` +
                        `Límite de fiado: $${account.creditLimitCents / 100}. ` +
                        `Faltan: $${(transaction.totalCents - availableFunds) / 100}`
                    );
                }

                const spentToday = await this.limits.getTodayDebitedCents(account.childId);
                const limit = await tx.dailyLimit.findUnique({ where: { childId: account.childId } });

                if (limit && limit.limitCents > 0 && (spentToday + transaction.totalCents > limit.limitCents)) {
                    throw new BadRequestException(`Límite diario excedido.`);
                }

                await tx.account.update({
                    where: { id: transaction.accountId as number },
                    data: { balanceCents: { decrement: transaction.totalCents } }
                });

            } else if (dto.paymentMethod === PaymentMethod.CASH) {
                const session = await tx.cashSession.findFirst({ where: { cashierId, terminalId, closedAt: null } });
                if (!session) throw new BadRequestException('Sesión de caja cerrada.');

                await tx.cashMovement.create({
                    data: {
                        cashSessionId: session.id,
                        kind: 'SALE',
                        amount: transaction.totalCents,
                        note: `Venta Tx:${transaction.id}`,
                    }
                });
            }


            for (const item of transaction.items) {
                const productId = item.productId;
                if (productId && item.product && item.product.trackStock) {
                    const newStock = item.product.stockQuantity - item.quantity;
                    if (newStock < 0) throw new BadRequestException(`Stock insuficiente para ${item.product.name}.`);

                    await tx.product.update({
                        where: { id: productId },
                        data: { stockQuantity: { decrement: item.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: productId,
                            type: 'SALE',
                            qtyDelta: item.quantity * -1,
                            reason: 'Venta de POS',
                            relatedId: `tx_item:${item.id}`,
                            unitCostCentsSnapshot: item.product.costCents,
                            userId: cashierId,
                        }
                    });

                    // Reposición Automática
                    await this.purchaseOrders.checkAndReplenish(productId, tx);
                }
            }

            const updatedTx = await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.PAID,
                    paymentMethod: dto.paymentMethod,
                    externalRef: dto.idempotencyKey,
                    completedAt: new Date(),
                },
            });

            // --- NOTIFICACIONES ---
            // Solo notificamos si es pago con tarjeta (alumno identificado)
            if (dto.paymentMethod === PaymentMethod.CARD && transaction.accountId) {
                try {
                    // Buscamos info para la notificación (Padre y nombre del alumno)
                    const accData = await tx.account.findUnique({
                        where: { id: transaction.accountId as number },
                        include: { child: true }
                    }) as any;

                    if (accData?.child.parentId) {
                        const childName = `${accData.child.firstName} ${accData.child.lastName}`;
                        const childId = accData.child.id;

                        // 1. Notificar movimiento (Compra)
                        await this.notifications.notifyMovement({
                            userId: accData.child.parentId,
                            childName,
                            amountCents: transaction.totalCents,
                            type: 'SALE'
                        });

                        // 2. Alerta de Saldo Bajo (Ej: < $1000)
                        if (accData.child.balanceCents < 1000) {
                            await this.notifications.notifyLowBalance({
                                userId: accData.child.parentId,
                                childName,
                                balanceCents: accData.child.balanceCents
                            });
                        }

                        // 3. Alerta de Límite Diario (80% o 100%)
                        const limit = await tx.dailyLimit.findUnique({ where: { childId: childId } });
                        if (limit && limit.limitCents > 0) {
                            const spentToday = await this.limits.getTodayDebitedCents(childId);
                            if (spentToday >= limit.limitCents) {
                                await this.notifications.notifyLimitReached({
                                    userId: accData.child.parentId,
                                    childName,
                                    limitCents: limit.limitCents
                                });
                            } else if (spentToday >= limit.limitCents * 0.8) {
                                await this.notifications.sendToUser({
                                    userId: accData.child.parentId,
                                    title: 'Límite diario por alcanzar',
                                    body: `${childName} ha gastado el 80% de su límite diario ($ ${(limit.limitCents / 100).toFixed(2)}).`,
                                    kind: 'LIMIT_REACHED'
                                });
                            }
                        }
                    }
                } catch (notifErr) {
                    console.error('Error enviando notificaciones post-venta:', notifErr);
                    // No cortamos el flujo de la venta si falla la notificación
                }
            }

            return updatedTx;
        }, { timeout: 15000 });

        // --- INVOICING (runs after DB transaction commits) ---
        await this.handlePostSaleInvoicing(result, terminalId, dto.shouldInvoice, dto.clientDocType, dto.clientDocNumber);

        return result;
    }

    /**
     * Anulación (VOID)
     */
    async voidTransaction(transactionId: number, dto: VoidDto, userRole: Role, cashierId: number, terminalId: number) {
        if (userRole !== Role.ADMIN && userRole !== Role.ENCARGADO) {
            throw new ForbiddenException('Permiso denegado para anular.');
        }

        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findFirst({
                where: { id: transactionId, terminalId, status: TransactionStatus.PAID },
                include: { items: { include: { product: true } } },
            });

            if (!transaction) throw new NotFoundException('Transacción pagada no encontrada.');

            const session = await tx.cashSession.findFirst({
                where: { terminalId, closedAt: null },
            });
            if (!session) throw new BadRequestException('Sesión de caja cerrada.');

            for (const item of transaction.items) {
                if (item.productId && item.product && item.product.trackStock) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { increment: item.quantity } },
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: 'RETURN',
                            qtyDelta: item.quantity,
                            reason: `Anulación VOID Tx:${transaction.id}`,
                            relatedId: `tx_item:${item.id}`,
                            unitCostCentsSnapshot: item.product.costCents ? (item.product.costCents * -1) : null,
                            userId: cashierId,
                        },
                    });
                }
            }

            if (transaction.paymentMethod === PaymentMethod.CASH) {
                await tx.cashMovement.create({
                    data: {
                        cashSessionId: session.id,
                        kind: 'VOID',
                        amount: transaction.totalCents * -1,
                        note: `Anulación VOID Tx:${transaction.id}. ${dto.reason}`,
                    },
                });
            } else if (transaction.paymentMethod === PaymentMethod.CARD && transaction.accountId) {
                await tx.account.update({
                    where: { id: transaction.accountId as number },
                    data: { balanceCents: { increment: transaction.totalCents } }
                });
            }

            return tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.VOID,
                    voidReason: dto.reason // Guardar razón obligatoria
                },
            });
        }, { timeout: 15000 });
    }

    /**
     * Hito EDU: Recarga de Saldo (TopUp).
     * Ingresa efectivo a la caja y crédito a la cuenta del alumno.
     */
    async creditBalance(
        dto: CreditByCardDto,
        cashierId: number,
        terminalId: number,
        ownerId: number
    ) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Buscar tarjeta y cuenta
            const card = await tx.card.findUnique({
                where: { uidHex: dto.uidHex },
                include: { child: { include: { accounts: { where: { ownerId } } } } }
            });

            if (!card || !card.child || card.child.accounts.length === 0) {
                throw new NotFoundException('Tarjeta o cuenta de alumno no encontrada.');
            }

            // 2. Validar Sesión de Caja (porque recibimos efectivo)
            const session = await tx.cashSession.findFirst({
                where: { cashierId, terminalId, closedAt: null }
            });
            if (!session) {
                throw new BadRequestException('Debe abrir caja para recibir recargas.');
            }

            // 3. Idempotencia
            const existing = await tx.transaction.findUnique({
                where: { externalRef: dto.idempotencyKey }
            });
            if (existing) return existing;

            // 4. Crear Transacción de Recarga (TOPUP)
            const transaction = await tx.transaction.create({
                data: {
                    type: TransactionType.TOPUP, // <-- Nuevo tipo
                    status: TransactionStatus.PAID, // Nace pagada
                    paymentMethod: PaymentMethod.CASH, // Se paga con efectivo
                    subTotalCents: dto.amountCents,
                    taxCents: 0,
                    totalCents: dto.amountCents,
                    ownerId,
                    cashierId,
                    terminalId,
                    externalRef: dto.idempotencyKey,
                    accountId: card.child.accounts[0].id, // Vinculada al alumno
                    startedAt: new Date(),
                    completedAt: new Date(),
                }
            });

            // 5. Actualizar Saldo de Cuenta (Sumar)
            await tx.account.update({
                where: { id: card.child.accounts[0].id },
                data: { balanceCents: { increment: dto.amountCents } }
            });

            // 6. Registrar Movimiento de Caja (Ingreso)
            await tx.cashMovement.create({
                data: {
                    cashSessionId: session.id,
                    kind: 'TOPUP', // O 'IN'
                    amount: dto.amountCents,
                    note: `Recarga Saldo Alumno: ${card.child.firstName} ${card.child.lastName}`,
                }
            });

            return transaction;
        });
    }

    /**
     * VENTA MASIVA (BULK): Ahora con VALIDACIÓN DE LÍMITE DIARIO
     */
    async processBulkTransaction(
        cashierId: number,
        terminalId: number,
        ownerId: number,
        dto: CreateTransactionDto
    ) {
        const isOffline = !!dto.isOffline; // Flag de Auditoría

        // --- IDEMPOTENCY GUARD ---
        // If the frontend sends an idempotencyKey, check if this sale was already processed.
        // This prevents duplicate sales during offline sync retries.
        if (dto.idempotencyKey) {
            const existing = await this.prisma.transaction.findFirst({
                where: { externalRef: dto.idempotencyKey, status: TransactionStatus.PAID },
                include: { items: true },
            });
            if (existing) {
                this.logger.log(`Idempotency hit: Transaction ${existing.id} already processed for key ${dto.idempotencyKey}`);
                return existing;
            }
        }

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Validar Sesión de Caja
            const session = await tx.cashSession.findFirst({
                where: { cashierId, terminalId, closedAt: null },
            });

            if (!dto.childId && !session) {
                // Si es Efectivo, se requiere sesión abierta.
                // Si es Offline, podríamos ser permisivos, pero la sesión es local...
                // Asumimos que si hay datos para subir, hubo sesión.
                if (!isOffline) throw new BadRequestException('El cajero no tiene una sesión de caja abierta.');
            }

            let calculatedTotal = 0;
            const transactionItemsData: Prisma.TransactionItemCreateWithoutTransactionInput[] = [];

            // 2. Procesar Items y Stock
            for (const itemDto of dto.items) {
                const product = await tx.product.findFirst({
                    where: { id: itemDto.productId, ownerId: ownerId },
                    include: { batches: { orderBy: { expirationDate: 'asc' } } }
                });

                if (!product) throw new NotFoundException(`Producto ID ${itemDto.productId} no existe.`);

                // Si es offline, permitimos vender inactivos (ya se vendió)
                if (!product.isActive && !isOffline) throw new BadRequestException(`Producto ${product.name} está inactivo.`);

                // VALIDACIÓN STOCK
                if (product.trackStock && product.stockQuantity < itemDto.quantity) {
                    if (!isOffline) {
                        throw new BadRequestException(`Stock insuficiente para ${product.name}. Disponibles: ${product.stockQuantity}`);
                    }
                    // Si es Offline, dejamos pasar (Logueamos advertencia interna si quisieramos)
                }

                const lineTotal = itemDto.unitPriceCents * itemDto.quantity;
                calculatedTotal += lineTotal;

                // --- LÓGICA FIFO ---
                if (product.trackStock) {
                    let remainingToDeduct = itemDto.quantity;

                    for (const batch of product.batches) {
                        if (remainingToDeduct <= 0) break;
                        if (batch.quantity <= 0) continue;
                        const takeFromBatch = Math.min(batch.quantity, remainingToDeduct);
                        await tx.productBatch.update({
                            where: { id: batch.id },
                            data: { quantity: { decrement: takeFromBatch } }
                        });
                        remainingToDeduct -= takeFromBatch;
                    }

                    await tx.product.update({
                        where: { id: product.id },
                        data: { stockQuantity: { decrement: itemDto.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            type: 'SALE',
                            qtyDelta: itemDto.quantity * -1,
                            reason: isOffline ? 'Venta Offline (Sync)' : 'Venta Directa POS',
                            unitCostCentsSnapshot: 0,
                            userId: cashierId,
                        }
                    });

                    // Reposición Automática
                    await this.purchaseOrders.checkAndReplenish(product.id, tx);
                }

                transactionItemsData.push({
                    product: { connect: { id: product.id } },
                    description: product.name,
                    quantity: itemDto.quantity,
                    unitPriceCents: itemDto.unitPriceCents,
                    totalLineCents: lineTotal,
                    taxRate: new Prisma.Decimal(0),
                });
            }

            // 3. Validar Totales (Solo advertencia)
            if (calculatedTotal !== dto.totalCents) {
                console.warn(`Discrepancia de precios: Front ${dto.totalCents} vs Back ${calculatedTotal} (Offline: ${isOffline})`);
            }

            // 4. Determinar Método de Pago
            // Prioridad: 1. Explícito en DTO (si es válido), 2. Inferido (si hay childId -> CARD, si no -> CASH)
            let paymentMethod: PaymentMethod = dto.childId ? PaymentMethod.CARD : PaymentMethod.CASH;

            if (dto.paymentMethod && ['CASH', 'CARD', 'ACCOUNT', 'TRANSFER', 'MERCADOPAGO'].includes(dto.paymentMethod)) {
                paymentMethod = dto.paymentMethod as PaymentMethod;
            }

            let accountId: number | null = null;

            // Si el método requiere validación de cuenta/alumno (CARD o ACCOUNT)
            if (dto.childId) {
                const account = await tx.account.findUnique({ where: { childId_ownerId: { childId: dto.childId, ownerId } } });
                if (!account) throw new BadRequestException('Cuenta de alumno no encontrada.');

                // Lógica de saldo SOLO si es CARD (Saldo) o si es MIXTO (no implementado aún)
                // Si es ACCOUNT (Fiado), NO checkeamos saldo disponible (o checkeamos limite de fiado si existiera)
                if (paymentMethod === PaymentMethod.CARD) {
                    // A. Validar Saldo
                    if (account.balanceCents < calculatedTotal) {
                        if (!isOffline) {
                            throw new BadRequestException('Saldo insuficiente en la cuenta del alumno.');
                        }
                    }

                    // --- B. VALIDACIÓN DE LÍMITE DIARIO ---
                    const limit = await tx.dailyLimit.findUnique({ where: { childId: dto.childId } });
                    if (limit && limit.limitCents > 0) {
                        const spentToday = await this.limits.getTodayDebitedCents(dto.childId);
                        const projectedTotal = spentToday + calculatedTotal;

                        if (projectedTotal > limit.limitCents) {
                            if (!isOffline) {
                                const disponible = Math.max(0, limit.limitCents - spentToday);
                                throw new BadRequestException(
                                    `Límite diario excedido. Límite: $${limit.limitCents / 100}. Gastado hoy: $${spentToday / 100}. Disponible: $${disponible / 100}`
                                );
                            }
                        }
                    }

                    // SOLO DESCONTAMOS SI ES CARD (DEBITO AUTOMÁTICO DE SALDO)
                    await tx.account.update({
                        where: { id: account.id },
                        data: { balanceCents: { decrement: calculatedTotal } }
                    });
                }
                // Si es ACCOUNT (Fiado), la cuenta queda asociada pero NO descontamos saldo (se deuda genera deuda o se registra pago diferido? 
                // Asumimos para este MVP que ACCOUNT es "Cuenta Corriente" y quizás resta saldo dejándolo negativo?
                // El modelo original de 'CARD' era "Saldo Prepago".
                // Si 'ACCOUNT' es fiaod, lo lógico sería que baje el saldo (negativo) o suba una deuda.
                // POR AHORA: Para no romper, asumimos que ACCOUNT también descuenta saldo, permitiendo negativo si se configura flag?
                // O mejor: ACCOUNT solo asocia la venta al alumno sin tocar saldo PREPAGO.

                // REVISION RAPIDA CON USUARIO: "estoy intentando pagar con el saldo de un alumno" -> Esto es CARD.
                // El error era que mandaba paymentMethod: 'CARD' y el back lo rebotaba.
                // Al agregar el campo al DTO ya se soluciona. 
                // Mantenemos la lógica original de descuento para CARD.

                accountId = account.id;
            } else {
                if (session) {
                    await tx.cashMovement.create({
                        data: {
                            cashSessionId: session.id,
                            kind: 'SALE',
                            amount: calculatedTotal,
                            note: isOffline ? `Venta Efectivo (Offline)` : `Venta Efectivo`,
                        }
                    });
                }
            }

            // 5. Crear la Transacción
            const transaction = await tx.transaction.create({
                data: {
                    type: TransactionType.SALE,
                    status: TransactionStatus.PAID,
                    paymentMethod: paymentMethod,
                    subTotalCents: calculatedTotal,
                    taxCents: 0,
                    totalCents: calculatedTotal,
                    ownerId: ownerId,
                    cashierId: cashierId,
                    terminalId: terminalId,
                    accountId: accountId,
                    externalRef: dto.idempotencyKey || null, // Idempotency key for offline sync
                    isOffline: isOffline, // <-- GUARDAMOS EL FLAG
                    startedAt: new Date(),
                    completedAt: new Date(),
                    items: {
                        create: transactionItemsData
                    }
                },
                include: { items: true }
            });

            return transaction;
        });

        // --- INVOICING (runs after DB transaction commits) ---
        await this.handlePostSaleInvoicing(result, terminalId, dto.shouldInvoice, dto.clientDocType, dto.clientDocNumber);

        return result;
    }
    /**
     * Shared invoicing helper — called after both single and bulk sales.
     * Won't throw: errors are logged and stored in TransactionError / InvoicingConfig.
     */
    private async handlePostSaleInvoicing(
        result: any,
        terminalId: number,
        shouldInvoice?: boolean,
        clientDocType?: number,
        clientDocNumber?: string,
    ) {
        try {
            if (!result || result.status !== 'PAID') return;

            const kiosk = await this.prisma.kiosk.findUnique({
                where: { id: terminalId },
                select: { schoolId: true },
            });
            if (!kiosk?.schoolId) return;

            if (shouldInvoice) {
                this.logger.log(`[FACTURA] Manual invoice triggered for TX#${result.id}`);
                await this.arca.createInvoice(kiosk.schoolId, result.id, clientDocType, clientDocNumber);
                result.invoiceStatus = 'CREATED';
            } else {
                await this.arca.autoInvoiceIfEnabled(kiosk.schoolId, result.id, result.totalCents);
                // Si pasa sin fallar, asumimos éxito (o simplemente no falló ruidosamente)
                result.invoiceStatus = 'CREATED';
            }
        } catch (err: any) {
            this.logger.error(`[FACTURA] Error (no afecta la venta): ${err.message}`);
            result.invoiceStatus = 'ERROR';
            result.invoiceError = err.message || 'Error de conexión con AFIP';
        }
    }

    /**
     *  * Búsqueda de Alumnos por Nombre, Apellido, DNI o Tarjeta NFC
     **/
    async searchStudent(term: string, ownerId: number) {
        // Limpiamos el término
        const q = term.trim();

        const students = await this.prisma.child.findMany({
            where: {
                isActive: true, // Solo alumnos activos
                OR: [
                    // 1. Por Nombre o Apellido (Contiene, insensible a mayúsculas)
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    // 2. Por DNI (Coincidencia parcial o exacta)
                    { documentNumber: { contains: q } },
                    // 3. Por Tarjeta NFC (UID Hex exacto) - Esto habilita el lector
                    { card: { uidHex: q } }
                ]
            },
            include: {
                accounts: { where: { ownerId } }, // Traemos la cuenta para ver el saldo
                card: true     // Traemos datos de tarjeta por si acaso
            },
            take: 10 // Limitamos a 10 resultados
        });

        return students.map(s => this.maskStudentData(s));
    }

    /**
     * Obfuscate sensitive student identity data to prevent leakage on POS
     */
    private maskStudentData(child: any) {
        const lastNameInitial = child.lastName ? child.lastName.trim().charAt(0) + '.' : '';
        const alias = `${child.firstName} ${lastNameInitial}`.trim();

        return {
            ...child,
            documentNumber: '***', // Prevents DNI leakage
            lastName: lastNameInitial, // Changes "Perez" to "P."
            alias: alias // Front-end ready alias "Juan P."
        };
    }

    /**
     * Obtener TODOS los alumnos (para sincronización Offline)
     */
    async getAllStudents(lastSync: string | undefined, ownerId: number) {
        const where: any = {};

        if (lastSync) {
            const date = new Date(lastSync);
            if (!isNaN(date.getTime())) {
                where.updatedAt = { gt: date };
                // Traemos inactivos también para que el POS los actualice/borre lógica
            } else {
                where.isActive = true;
            }
        } else {
            where.isActive = true; // Full sync default
        }

        const students = await this.prisma.child.findMany({
            where,
            include: {
                accounts: { where: { ownerId } },
                card: true,
                dailyLimit: true
            }
        });

        return students.map(s => this.maskStudentData(s));
    }

    /**
     * Carga de Saldo Presencial (POS)
     * Ingresa Efectivo -> Sube Saldo Cuenta
     */
    async chargeBalance(dto: ChargeBalanceDto, cashierId: number, terminalId: number, ownerId: number) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Validar Sesión de Caja (Obligatorio porque entra dinero)
            const session = await tx.cashSession.findFirst({
                where: { cashierId, terminalId, closedAt: null }
            });

            if (!session) {
                throw new BadRequestException('Debes abrir la caja para recibir cobros.');
            }

            // 2. Buscar la Cuenta del Alumno
            let account;

            if (dto.childId) {
                // Opción A: Por ID de alumno
                account = await tx.account.findUnique({
                    where: { childId_ownerId: { childId: dto.childId, ownerId } },
                    include: { child: true }
                });
            } else if (dto.cardUid) {
                // Opción B: Por Tarjeta NFC
                const card = await tx.card.findUnique({
                    where: { uidHex: dto.cardUid },
                    include: { child: { include: { accounts: { where: { ownerId } } } } }
                });
                account = card?.child?.accounts?.[0];
            }

            if (!account) {
                throw new NotFoundException('Alumno o Cuenta no encontrada.');
            }

            // 3. Crear Transacción (TOPUP)
            const transaction = await tx.transaction.create({
                data: {
                    type: TransactionType.TOPUP,
                    status: TransactionStatus.PAID,
                    paymentMethod: PaymentMethod.CASH, // Entra efectivo
                    subTotalCents: dto.amountCents,
                    taxCents: 0,
                    totalCents: dto.amountCents,
                    ownerId: ownerId,
                    cashierId,
                    terminalId,
                    accountId: account.id,
                    startedAt: new Date(),
                    completedAt: new Date(),
                    items: {
                        create: [{
                            description: 'Carga de Saldo (Efectivo)',
                            quantity: 1,
                            unitPriceCents: dto.amountCents,
                            totalLineCents: dto.amountCents,
                            taxRate: new Prisma.Decimal(0)
                        }]
                    }
                }
            });

            // 4. Acreditar en Cuenta del Alumno
            await tx.account.update({
                where: { id: account.id },
                data: { balanceCents: { increment: dto.amountCents } }
            });

            // 5. Registrar Ingreso en Caja (CashMovement)
            await tx.cashMovement.create({
                data: {
                    cashSessionId: session.id,
                    kind: 'TOPUP', // Unificamos con creditBalance
                    amount: dto.amountCents,
                    note: `Carga Saldo: ${account.child.firstName} ${account.child.lastName}`
                }
            });

            return transaction;
        });
    }

    async getTransactionDetails(id: number) {
        const tx = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                items: true, // Items vendidos
                cashier: { select: { name: true } }, // Nombre del cajero
                account: { include: { child: true } } // Si pagó con saldo, quién fue
            }
        });
        if (!tx) throw new NotFoundException('Transacción no encontrada');
        return tx;
    }

    async getStudent(id: number, ownerId: number) {
        const student = await this.prisma.child.findUnique({
            where: { id },
            include: {
                accounts: { where: { ownerId } },
                card: true,
                dailyLimit: true
            }
        });
        if (!student) throw new NotFoundException('Alumno no encontrado');
        return this.maskStudentData(student);
    }

    async getStudentTransactions(studentId: number, ownerId: number) {
        const account = await this.prisma.account.findUnique({
            where: { childId_ownerId: { childId: studentId, ownerId } }
        });

        if (!account) return [];

        const transactions = await this.prisma.transaction.findMany({
            where: { accountId: account.id },
            orderBy: { completedAt: 'desc' },
            take: 50,
            include: {
                items: { select: { description: true, quantity: true } }
            }
        });

        return transactions.map(tx => ({
            id: tx.id,
            date: tx.completedAt || tx.startedAt,
            type: tx.type === 'SALE' ? 'PURCHASE' : (tx.type === 'TOPUP' ? 'PAYMENT' : 'ADJUSTMENT'),
            amountCents: tx.totalCents,
            description: tx.type === 'SALE'
                ? tx.items.map(i => `${i.quantity}x ${i.description}`).join(', ')
                : (tx.type === 'TOPUP' ? 'Carga de saldo' : 'Ajuste de cuenta')
        }));
    }

    async getPendingTopups(ownerId: number) {
        return this.prisma.transaction.findMany({
            where: {
                type: TransactionType.TOPUP,
                status: TransactionStatus.PENDING,
                paymentMethod: PaymentMethod.CASH,
                ownerId,
            },
            include: {
                account: {
                    include: {
                        child: true
                    }
                }
            },
            orderBy: { startedAt: 'desc' },
        });
    }

    async approveTopup(transactionId: number, cashierId: number, terminalId: number, ownerId: number) {
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findFirst({
                where: {
                    id: transactionId,
                    status: TransactionStatus.PENDING,
                    type: TransactionType.TOPUP,
                    ownerId
                },
                include: { account: { include: { child: true } } },
            });

            if (!transaction) throw new NotFoundException('Solicitud de recarga no encontrada o ya procesada.');

            // Validar sesión de caja
            const session = await tx.cashSession.findFirst({
                where: { cashierId, terminalId, closedAt: null },
            });
            if (!session) throw new BadRequestException('El cajero no tiene una sesión de caja abierta para recibir el dinero.');

            // 1. Actualizar transacción
            const updatedTx = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.PAID,
                    completedAt: new Date(),
                    cashierId: cashierId,
                    terminalId: terminalId,
                },
            });

            // 2. Incrementar saldo (accountId is definitely there for TOPUP)
            await tx.account.update({
                where: { id: transaction.accountId as number },
                data: { balanceCents: { increment: transaction.totalCents } }
            });

            // 3. Movimiento de caja
            await tx.cashMovement.create({
                data: {
                    cashSessionId: session.id,
                    kind: 'TOPUP',
                    amount: transaction.totalCents,
                    note: `Recarga de App aprobada (Tx #${transaction.id}) para ${transaction.account?.child.firstName}`,
                }
            });

            // 4. Notificar al padre
            if (transaction.account?.child.parentId) {
                try {
                    await this.notifications.notifyMovement({
                        userId: transaction.account.child.parentId,
                        childName: `${transaction.account.child.firstName} ${transaction.account.child.lastName}`,
                        amountCents: transaction.totalCents,
                        type: 'TOPUP'
                    });
                } catch (e) {
                    this.logger.warn(`Error enviando notificación push de aprobación: ${e.message}`);
                }
            }

            return updatedTx;
        });
    }
}