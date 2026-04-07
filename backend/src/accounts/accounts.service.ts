import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';
import { AccountMovementDto } from './dto/account-movement.dto';
import { Role } from '../auth/roles.enum';

@Injectable()
export class AccountsService {
    constructor(private readonly prisma: PrismaService) {}

    async ensureAccount(childId: number) {
        const child = await this.prisma.child.findUnique({ where: { id: childId } });
        if (!child) throw new NotFoundException('Child not found');

        let acc = await this.prisma.account.findFirst({ where: { childId } });
        if (!acc) {
            const owner = await this.prisma.owner.findFirst({ where: { schoolId: child.schoolId } });
            acc = await this.prisma.account.create({ data: { childId, ownerId: owner?.id || 1 } });
        }
        return acc;
    }

    /**
     * Verificar que el padre es dueño del hijo consultado.
     * Los ADMIN pueden acceder a cualquier hijo.
     */
    private async verifyOwnership(childId: number, userId: number, userRoles: string[]) {
        if (userRoles.includes(Role.ADMIN)) return; // Los ADMIN siempre tienen acceso
        const child = await this.prisma.child.findUnique({ where: { id: childId } });
        if (!child) throw new NotFoundException('Alumno no encontrado');
        if (child.parentId !== userId) {
            throw new ForbiddenException('No tenés permiso para ver los datos de este alumno');
        }
    }

    async getBalance(childId: number, userId?: number, userRoles?: string[]) {
        if (userId != null && userRoles) {
            await this.verifyOwnership(childId, userId, userRoles);
        }
        const acc = await this.prisma.account.findFirst({ where: { childId } });
        if (!acc) throw new NotFoundException('Cuenta no encontrada');
        return { balanceCents: acc.balanceCents };
    }

    async getStatement(childId: number, take: number, userId?: number, userRoles?: string[]): Promise<AccountMovementDto[]> {
        if (userId != null && userRoles) {
            await this.verifyOwnership(childId, userId, userRoles);
        }

        const account = await this.prisma.account.findFirst({
            where: { childId } as any,
        });
        if (!account) return [];

        const txs = await this.prisma.transaction.findMany({
            where: {
                accountId: account.id,
                status: { in: [TransactionStatus.PAID, TransactionStatus.PENDING] },
            },
            include: { items: true },
            orderBy: { startedAt: 'desc' },
            take,
        });

        return txs.map((tx) => ({
            id: tx.id,
            type: tx.type,
            createdAt: tx.completedAt ?? tx.startedAt,
            totalCents: tx.totalCents,
            description: null,
            status: tx.status,
            paymentMethod: tx.paymentMethod,
            items: tx.items.map(item => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
                totalLineCents: item.totalLineCents
            }))
        }));
    }
}