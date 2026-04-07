import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildrenService {
    constructor(private prisma: PrismaService) { }

    // Crear hijo vinculado a un padre
    async create(parentId: number, createChildDto: CreateChildDto) {
        const { schoolId, inviteCode, ...childData } = createChildDto;

        let resolvedSchoolId = schoolId;
        
        // Si viene un inviteCode, buscar el colegio
        if (inviteCode) {
            const school = await this.prisma.school.findUnique({
                where: { inviteCode: inviteCode.toUpperCase() }
            });
            if (!school) throw new NotFoundException('Código de colegio inválido');
            resolvedSchoolId = school.id;
        }

        if (!resolvedSchoolId) {
            throw new BadRequestException('Se requiere el código de invitación (inviteCode) o schoolId');
        }

        // Buscar el owner principal del colegio para vincular la cuenta
        const owner = await this.prisma.owner.findFirst({
            where: { schoolId: resolvedSchoolId }
        });
        const ownerId = owner?.id || 1; // Fallback a 1 si el colegio recién se crea y no tiene owner

        // Crear Child y su Account automáticamente
        return this.prisma.child.create({
            data: {
                ...childData,
                schoolId: resolvedSchoolId,
                parentId, // Vincular al padre logueado
                accounts: {
                    create: {
                        balanceCents: 0,
                        ownerId: ownerId
                    }
                },
                dailyLimit: {
                    create: {
                        limitCents: 0 // Sin límite por defecto (o poner un valor default)
                    }
                }
            },
            include: {
                accounts: true,
                dailyLimit: true
            }
        });
    }

    // Obtener hijos de un padre específico
    async findAllByParent(parentId: number) {
        return this.prisma.child.findMany({
            where: { parentId, isActive: true },
            include: {
                accounts: true,
                dailyLimit: true,
                school: { select: { name: true } }
            }
        });
    }

    async findOne(id: number, parentId: number) {
        const child = await this.prisma.child.findFirst({
            where: { id, parentId },
            include: {
                accounts: true,
                card: true
            }
        });
        if (!child) throw new NotFoundException(`Hijo #${id} no encontrado o no te pertenece`);
        return child;
    }

    async update(id: number, parentId: number, updateChildDto: UpdateChildDto) {
        // Verificar propiedad
        await this.findOne(id, parentId);

        const { schoolId, ...data } = updateChildDto;

        return this.prisma.child.update({
            where: { id },
            data: {
                ...data,
                // Si cambia schoolId
                ...(schoolId ? { schoolId } : {})
            }
        });
    }

    async remove(id: number, parentId: number) {
        // Verificar propiedad
        await this.findOne(id, parentId);

        // Soft delete
        return this.prisma.child.update({
            where: { id },
            data: { isActive: false }
        });
    }

    async transferBalance(parentId: number, transferDto: import('./dto/transfer.dto').TransferDto) {
        const { fromChildId, toChildId, amountCents } = transferDto;

        if (amountCents <= 0) {
            throw new BadRequestException('El monto debe ser mayor a 0');
        }
        
        if (fromChildId === toChildId) throw new ForbiddenException('No podes transferir a la misma cuenta');

        // Verificar que ambos hijos le pertenecen al padre
        const fromChild = await this.findOne(fromChildId, parentId);
        const toChild = await this.findOne(toChildId, parentId);

        try {
            return await this.prisma.$transaction(async (tx) => {
                const fromAccount = await tx.account.findFirst({ where: { childId: fromChildId } });
                const toAccount = await tx.account.findFirst({ where: { childId: toChildId } });

                if (!fromAccount || !toAccount) throw new NotFoundException('Cuentas no encontradas');
                if (fromAccount.balanceCents < amountCents) throw new ForbiddenException('Saldo insuficiente');

                const updatedFrom = await tx.account.update({
                    where: { id: fromAccount.id },
                    data: { balanceCents: { decrement: amountCents } }
                });

                const updatedTo = await tx.account.update({
                    where: { id: toAccount.id },
                    data: { balanceCents: { increment: amountCents } }
                });

                // 1. Débito
                await tx.transaction.create({
                    data: {
                        type: 'SALE',
                        status: 'PAID',
                        paymentMethod: 'TRANSFER',
                        subTotalCents: amountCents,
                        taxCents: 0,
                        totalCents: amountCents,
                        ownerId: fromAccount.ownerId,
                        cashierId: parentId,
                        terminalId: 0,
                        accountId: fromAccount.id,
                        isOffline: false,
                        items: {
                            create: [{
                                description: `Transferencia a ${toChild.firstName}`,
                                quantity: 1,
                                unitPriceCents: amountCents,
                                totalLineCents: amountCents
                            }]
                        }
                    }
                });

                // 2. Crédito
                await tx.transaction.create({
                    data: {
                        type: 'TOPUP',
                        status: 'PAID',
                        paymentMethod: 'TRANSFER',
                        subTotalCents: amountCents,
                        taxCents: 0,
                        totalCents: amountCents,
                        ownerId: toAccount.ownerId,
                        cashierId: parentId,
                        terminalId: 0,
                        accountId: toAccount.id,
                        isOffline: false,
                        items: {
                            create: [{
                                description: `Transferencia recibida de ${fromChild.firstName}`,
                                quantity: 1,
                                unitPriceCents: amountCents,
                                totalLineCents: amountCents
                            }]
                        }
                    }
                });

                return { success: true, fromBalance: updatedFrom.balanceCents, toBalance: updatedTo.balanceCents };
            });
        } catch (error: any) {
            console.error('TRANSFER ERROR:', error);
            throw new BadRequestException('Transaction failed: ' + (error.message || String(error)));
        }
    }

    async toggleCardBlock(childId: number, parentId: number, isBlocked: boolean) {
        await this.findOne(childId, parentId);
        const card = await this.prisma.card.findFirst({ where: { childId } });
        if (!card) throw new NotFoundException('El alumno no tiene una credencial asociada.');

        // Log the card event
        await this.prisma.cardEvent.create({
            data: {
                cardId: card.id,
                event: isBlocked ? 'BLOCKED' : 'UNBLOCKED',
                reason: isBlocked ? 'Bloqueado por el padre' : 'Desbloqueado por el padre',
                userId: parentId,
            }
        });

        return this.prisma.card.update({
            where: { id: card.id },
            data: { isBlocked }
        });
    }

    // ── Card History ────────────────────────────────
    async getCardEvents(childId: number, parentId: number) {
        await this.findOne(childId, parentId);
        const card = await this.prisma.card.findFirst({ where: { childId } });
        if (!card) return [];

        return this.prisma.cardEvent.findMany({
            where: { cardId: card.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    // ── Spending Summary ────────────────────────────
    async getSpendingSummary(childId: number, parentId: number, days: number = 7) {
        await this.findOne(childId, parentId);

        const account = await this.prisma.account.findFirst({ where: { childId } });
        if (!account) return { totalCents: 0, categories: [] };

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Get paid SALE transactions in the time range
        const txs = await this.prisma.transaction.findMany({
            where: {
                accountId: account.id,
                type: 'SALE',
                status: 'PAID',
                completedAt: { gte: since },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { categoryId: true, category: true }
                        }
                    }
                }
            }
        });

        // Aggregate by category
        const catMap = new Map<string, { name: string; totalCents: number; count: number }>();
        let totalCents = 0;

        for (const tx of txs) {
            totalCents += tx.totalCents;
            for (const item of tx.items) {
                const catName = item.product?.category ?? 'Sin categoría';
                const key = catName;
                const existing = catMap.get(key) || { name: catName, totalCents: 0, count: 0 };
                existing.totalCents += item.totalLineCents;
                existing.count += item.quantity;
                catMap.set(key, existing);
            }
        }

        const categories = Array.from(catMap.values())
            .sort((a, b) => b.totalCents - a.totalCents);

        return { totalCents, days, transactionCount: txs.length, categories };
    }

    // ── Category Restrictions ───────────────────────
    async getCategoryRestrictions(childId: number, parentId: number) {
        await this.findOne(childId, parentId);
        return this.prisma.categoryRestriction.findMany({
            where: { childId },
        });
    }

    async addCategoryRestriction(childId: number, parentId: number, categoryId: number) {
        await this.findOne(childId, parentId);
        return this.prisma.categoryRestriction.upsert({
            where: { childId_categoryId: { childId, categoryId } },
            update: {},
            create: { childId, categoryId, createdBy: parentId },
        });
    }

    async removeCategoryRestriction(childId: number, parentId: number, categoryId: number) {
        await this.findOne(childId, parentId);
        return this.prisma.categoryRestriction.delete({
            where: { childId_categoryId: { childId, categoryId } },
        }).catch(() => ({ deleted: false }));
    }
}
