import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async getAuditFeed(limit: number = 50) {
        const [
            recentSales,
            recentTopups,
            priceChanges,
            voids,
            cashAdjustments,
            reconciliations,
            sessionEvents,
        ] = await Promise.all([
            // --- VENTAS RECIENTES (nuevo) ---
            this.prisma.transaction.findMany({
                where: { status: TransactionStatus.PAID, type: TransactionType.SALE },
                take: limit,
                orderBy: { completedAt: 'desc' },
                include: {
                    cashier: { select: { name: true } },
                    items: { select: { description: true, quantity: true } },
                    account: { include: { child: { select: { firstName: true, lastName: true } } } },
                },
            }),
            // --- CARGAS DE SALDO (nuevo) ---
            this.prisma.transaction.findMany({
                where: { status: TransactionStatus.PAID, type: TransactionType.TOPUP },
                take: limit,
                orderBy: { completedAt: 'desc' },
                include: {
                    cashier: { select: { name: true } },
                    account: { include: { child: { select: { firstName: true, lastName: true } } } },
                },
            }),
            // --- CAMBIOS DE PRECIO ---
            this.prisma.priceHistory.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { name: true } },
                    changedBy: { select: { name: true } },
                },
            }),
            // --- ANULACIONES ---
            this.prisma.transaction.findMany({
                where: { status: TransactionStatus.VOID },
                take: limit,
                orderBy: { completedAt: 'desc' },
                include: { cashier: { select: { name: true } } },
            }),
            // --- RETIROS Y AJUSTES DE CAJA ---
            this.prisma.cashMovement.findMany({
                where: { kind: { in: ['WITHDRAWAL', 'ADJUSTMENT'] } },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { cashSession: { include: { cashier: { select: { name: true } } } } },
            }),
            // --- AJUSTES DE STOCK ---
            this.prisma.stockMovement.findMany({
                where: { type: 'RECONCILE' },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { product: { select: { name: true } } },
            }),
            // --- APERTURAS/CIERRES DE CAJA (nuevo) ---
            this.prisma.cashSession.findMany({
                take: limit,
                orderBy: { openedAt: 'desc' },
                include: {
                    cashier: { select: { name: true } },
                    closedByUser: { select: { name: true } },
                },
            }),
        ]);

        // Unificar y mapear a un formato común
        const events = [
            // Ventas
            ...recentSales.map(s => {
                const itemsSummary = s.items.map(i => `${i.quantity}x ${i.description}`).join(', ');
                const childName = s.account?.child
                    ? `${s.account.child.firstName} ${s.account.child.lastName}`
                    : null;
                return {
                    id: `sale_${s.id}`,
                    type: 'SALE',
                    at: s.completedAt || s.startedAt,
                    title: 'Venta Registrada',
                    message: `Venta de $${s.totalCents / 100} por ${s.cashier.name}.${childName ? ` Alumno: ${childName}.` : ''} (${s.paymentMethod})`,
                    details: { items: itemsSummary, total: s.totalCents / 100, method: s.paymentMethod, offline: s.isOffline },
                };
            }),
            // Cargas de Saldo
            ...recentTopups.map(t => {
                const childName = t.account?.child
                    ? `${t.account.child.firstName} ${t.account.child.lastName}`
                    : 'Sin alumno';
                return {
                    id: `topup_${t.id}`,
                    type: 'TOPUP',
                    at: t.completedAt || t.startedAt,
                    title: 'Carga de Saldo',
                    message: `Carga de $${t.totalCents / 100} a ${childName} por ${t.cashier.name}.`,
                    details: { amount: t.totalCents / 100, child: childName },
                };
            }),
            // Cambios de precio
            ...priceChanges.map((h: any) => ({
                id: `price_${h.id}`,
                type: 'PRICE_CHANGE',
                at: h.createdAt,
                title: 'Cambio de Precio',
                message: `${h.product.name}: $${(h.oldPriceCents || 0) / 100} → $${(h.newPriceCents || 0) / 100}${h.changedBy ? ` por ${h.changedBy.name}` : ''}`,
                details: {
                    oldPrice: h.oldPriceCents ? h.oldPriceCents / 100 : null,
                    newPrice: h.newPriceCents ? h.newPriceCents / 100 : null,
                    changedBy: h.changedBy?.name || null,
                },
            })),
            // Anulaciones
            ...voids.map(v => ({
                id: `void_${v.id}`,
                type: 'VOID_SALE',
                at: v.completedAt || v.startedAt,
                title: 'Venta Anulada',
                message: `Venta por $${v.totalCents / 100} anulada por ${v.cashier.name}.`,
                details: { reason: v.voidReason, amount: v.totalCents / 100 },
            })),
            // Retiros/Ajustes de caja
            ...cashAdjustments.map(c => ({
                id: `cash_${c.id}`,
                type: 'CASH_ADJUSTMENT',
                at: c.createdAt,
                title: c.kind === 'WITHDRAWAL' ? 'Retiro de Efectivo' : 'Ajuste de Caja',
                message: `${c.kind === 'WITHDRAWAL' ? 'Retiro' : 'Ajuste'} de $${c.amount / 100} por ${c.cashSession.cashier.name}.`,
                details: { note: c.note, amount: c.amount / 100 },
            })),
            // Ajustes de stock
            ...reconciliations.map(r => ({
                id: `reconcile_${r.id}`,
                type: 'STOCK_RECONCILE',
                at: r.createdAt,
                title: 'Ajuste de Stock',
                message: `Ajuste de ${r.qtyDelta} uds en ${r.product.name}.`,
                details: { reason: r.reason, delta: r.qtyDelta },
            })),
            // Sesiones de caja
            ...sessionEvents.flatMap(s => {
                const items: any[] = [];
                items.push({
                    id: `session_open_${s.id}`,
                    type: 'SESSION_OPEN',
                    at: s.openedAt,
                    title: 'Apertura de Caja',
                    message: `${s.cashier.name} abrió la caja con $${s.openingBalanceCents / 100}.`,
                    details: { opening: s.openingBalanceCents / 100 },
                });
                if (s.closedAt) {
                    items.push({
                        id: `session_close_${s.id}`,
                        type: 'SESSION_CLOSE',
                        at: s.closedAt,
                        title: 'Cierre de Caja',
                        message: `${s.closedByUser?.name || s.cashier.name} cerró la caja. Cierre: $${(s.closingBalanceCents || 0) / 100}. Diferencia: $${(s.diffCents || 0) / 100}.`,
                        details: { closing: (s.closingBalanceCents || 0) / 100, diff: (s.diffCents || 0) / 100 },
                    });
                }
                return items;
            }),
        ];

        return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
    }
}
