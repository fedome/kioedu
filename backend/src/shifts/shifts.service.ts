import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
    constructor(private prisma: PrismaService) { }

    async openCashSession(
        terminalId: number,
        cashierId: number,
        dto: OpenShiftDto,
    ) {
        // 1. Validar que no haya una sesión abierta (sin cambios)
        const existing = await this.prisma.cashSession.findFirst({
            where: { terminalId, closedAt: null },
        });
        if (existing) {
            throw new BadRequestException(
                `La terminal ${terminalId} ya tiene una sesión de caja abierta (ID: ${existing.id})`,
            );
        }

        // 2. Crear la sesión (sin cambios)
        const session = await this.prisma.cashSession.create({
            data: {
                terminalId: terminalId,
                cashierId: cashierId,
                openingBalanceCents: dto.openingFloat ?? 0,
            },
        });

        // 3. --- ¡ARREGLO! ---
        // (Eliminamos la creación del CashMovement 'IN' inicial,
        // porque 'openingBalanceCents' ya es nuestro punto de partida)
        //
        // if (session.openingBalanceCents > 0) {
        //   await this.prisma.cashMovement.create({ ... });
        // }
        // --- FIN DEL ARREGLO ---

        return session;
    }

    /**
     * V2: Cierra la sesión de caja abierta para una terminal.
     * ¡LÓGICA DE CÁLCULO SIMPLIFICADA Y CORREGIDA!
     */
    async closeCashSession(
        terminalId: number,
        closedByUserId: number,
        dto: CloseShiftDto,
    ) {
        // 1. Encontrar la sesión abierta (sin cambios)
        const session = await this.prisma.cashSession.findFirst({
            where: { terminalId, closedAt: null },
        });
        if (!session) {
            throw new NotFoundException(
                `No se encontró una sesión de caja abierta para la terminal ${terminalId}`,
            );
        }

        // --- 2. CALCULAR EFECTIVO ESPERADO (LÓGICA SIMPLE) ---

        // 2a. Sumar el 'amount' de TODOS los movimientos de caja.
        // (El 'amount' ya tiene el signo: IN/SALE son +, OUT/DROP/VOID son -)
        const movementsSum = await this.prisma.cashMovement.aggregate({
            where: { cashSessionId: session.id },
            _sum: { amount: true }, // Suma todos los 'amount'
        });

        const totalMovements = movementsSum._sum.amount ?? 0;

        // 2b. Cálculo Final (¡Ya no hay doble conteo!)
        const expectedCash = session.openingBalanceCents + totalMovements;

        // 3. Cerrar la sesión
        const diffCash = dto.countedCash - expectedCash;

        const closedSession = await this.prisma.cashSession.update({
            where: { id: session.id },
            data: {
                closedAt: new Date(),
                closedByUserId: closedByUserId,
                closingBalanceCents: dto.countedCash,
                expectedBalanceCents: expectedCash, // <-- ¡Preciso!
                diffCents: diffCash,
            },
        });

        return closedSession;
    }

    /**
     * V2: Agrega un movimiento de caja (IN/OUT/ADJUST) a la sesión abierta.
     * AHORA GUARDA EL SIGNO CORRECTO.
     */
    async addCashMovement(
        terminalId: number,
        kind: 'IN' | 'OUT' | 'ADJUST' | 'DROP',
        amount: number, // <-- El front siempre envía un número positivo
        note?: string,
    ) {
        const session = await this.prisma.cashSession.findFirst({
            where: { terminalId, closedAt: null },
        });
        if (!session) {
            throw new NotFoundException(
                `No se encontró una sesión de caja abierta para la terminal ${terminalId}`,
            );
        }
        if (amount <= 0) {
            throw new BadRequestException('El monto debe ser > 0');
        }

        // --- LÓGICA DE SIGNO ---
        let amountToStore = amount;

        // Egresos (OUT, DROP) se guardan como negativos
        if (kind === 'OUT' || kind === 'DROP') {
            amountToStore = amount * -1;
        }
        // (ADJUST puede ser positivo o negativo, asumimos positivo
        // a menos que el 'note' diga lo contrario, o el front envíe el signo)
        // (SALE y VOID ya son manejados por 'pay' y 'void' y tienen sus signos)
        // ---------------------

        return this.prisma.cashMovement.create({
            data: {
                cashSessionId: session.id,
                kind,
                amount: amountToStore, // <-- Guardamos con el signo correcto
                note,
            },
        });
    }

    async getCashSessionSummary(terminalId: number, lastClosed: boolean = false) {
        const session = lastClosed
            ? await this.prisma.cashSession.findFirst({
                where: { terminalId, closedAt: { not: null } },
                orderBy: { closedAt: 'desc' },
            })
            : await this.prisma.cashSession.findFirst({
                where: { terminalId, closedAt: null },
            });

        if (!session) {
            throw new NotFoundException('No se encontró la sesión de caja');
        }

        // 1. Movimientos de Caja Físicos (Para arqueo: IN, OUT, DROP, SALE, VOID, TOPUP)
        // Fuente de Verdad para "Efectivo Esperado".
        const movs = await this.prisma.cashMovement.groupBy({
            by: ['kind'],
            where: { cashSessionId: session.id },
            _sum: { amount: true },
        });

        // 2. Desglose de Ventas/Transacciones
        // Consultamos Transaction para mostrar detalles ricos (Ventas vs Cuenta, etc).
        const txGroups = await this.prisma.transaction.groupBy({
            by: ['type', 'paymentMethod', 'status'],
            where: {
                terminalId: terminalId,
                cashierId: session.cashierId,
                status: { in: ['PAID', 'VOID'] }, // Incluimos VOID para mostrar anulaciones
                completedAt: { gte: session.openedAt }
            },
            _sum: { totalCents: true },
            _count: { id: true }
        });

        const breakdown = {
            salesCash: 0,
            salesCard: 0,
            salesWallet: 0,
            salesMP: 0,
            salesTransfer: 0,
            refundsCash: 0,
            refundsCard: 0,
            refundsWallet: 0,
            refundsMP: 0,
            refundsTransfer: 0,
            topupsCash: 0,
            topupsAccount: 0,
            totalSystem: 0,
            txCount: 0
        };

        txGroups.forEach(group => {
            const amount = group._sum.totalCents || 0;
            const count = group._count.id || 0;
            const pm = group.paymentMethod;

            if (group.status === 'VOID' || group.type === 'REFUND') {
                // Anulaciones / Reembolsos
                if (pm === 'CASH') breakdown.refundsCash += amount;
                else if (pm === 'CARD') breakdown.refundsCard += amount;
                else if (pm === 'WALLET') breakdown.refundsWallet += amount;
                else if (pm === 'MERCADOPAGO') breakdown.refundsMP += amount;
                else if (pm === 'TRANSFER') breakdown.refundsTransfer += amount;
            } else {
                // PAID / PENDING (if applicable, but usually PAID for results)
                if (group.type === 'SALE') {
                    if (pm === 'CASH') breakdown.salesCash += amount;
                    else if (pm === 'CARD') breakdown.salesCard += amount;
                    else if (pm === 'WALLET') breakdown.salesWallet += amount;
                    else if (pm === 'MERCADOPAGO') breakdown.salesMP += amount;
                    else if (pm === 'TRANSFER') breakdown.salesTransfer += amount;
                } else if (group.type === 'TOPUP') {
                    if (pm === 'CASH') breakdown.topupsCash += amount;
                    else breakdown.topupsAccount += amount;
                }
            }
            breakdown.txCount += count;
        });

        // 3. Calculamos Totales Finales

        // A. Total de Movimientos (Fuente de Verdad)
        let totalMovementsDelta = 0;
        let manualMovementsTotal = 0;

        movs.forEach(m => {
            const amt = m._sum.amount || 0;
            totalMovementsDelta += amt;

            // Para el reporte visual, separamos "Movimientos Manuales" de las ventas automáticas
            if (!['SALE', 'VOID', 'TOPUP'].includes(m.kind)) {
                manualMovementsTotal += amt;
            }
        });

        // B. Efectivo Esperado = Inicio + DeltaTotal (Sales, Voids, Topups, Manuals)
        const expectedCash = session.openingBalanceCents + totalMovementsDelta;

        return {
            session: {
                ...session,
                expectedBalanceCents: expectedCash
            },
            movs, // Se envía crudo por si el front lo usa
            salesBreakdown: {
                ...breakdown,
                movementsTotal: manualMovementsTotal // Enviamos el total manual calculado
            }
        };
    }

    async findAll(limit: number = 20) {
        return this.prisma.cashSession.findMany({
            orderBy: { openedAt: 'desc' },
            take: limit,
            include: {
                cashier: { select: { name: true } }
            }
        });
    }
}
