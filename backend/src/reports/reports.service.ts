import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { Prisma, TransactionStatus } from '@prisma/client'; // V2: Importamos Prisma (no 'TxType')
import { fromZonedTime } from 'date-fns-tz';

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';
const MAX_PAGE_SIZE = 500;
const CSV_BATCH_SIZE = 5000;

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    // ===================================================================
    // HELPERS (REINCORPORADOS DE TU V1)
    // ===================================================================

    private toBoolean(v?: string): boolean {
        if (v == null) return false;
        return v === 'true' || v === '1';
    }

    private toUtcRange(dto: ReportQueryDto) {
        const tz = dto.tz || DEFAULT_TZ;
        if (!dto.from || !dto.to) {
            throw new BadRequestException('Both "from" and "to" are required (ISO local).');
        }
        const fromUtc = fromZonedTime(dto.from, tz);
        const toUtc = fromZonedTime(dto.to, tz);
        if (Number.isNaN(+fromUtc) || Number.isNaN(+toUtc)) {
            throw new BadRequestException('Invalid "from" or "to" format.');
        }
        if (fromUtc > toUtc) {
            throw new BadRequestException('"from" must be <= "to"');
        }
        return { fromUtc, toUtc, tz };
    }

    // ===================================================================
    // LÓGICA DE REPORTES V2 (REFACTORIZADA)
    // ===================================================================

    /**
     * where base (V2)
     */
    private baseWhere(dto: ReportQueryDto): Prisma.TransactionWhereInput {
        const { fromUtc, toUtc } = this.toUtcRange(dto);

        const where: Prisma.TransactionWhereInput = {
            startedAt: { gte: fromUtc, lte: toUtc },
        };

        // --- ARREGLO ---
        // 'dto.type' ahora es del tipo correcto (TransactionType) gracias
        // al DTO actualizado, por lo que esta línea ya no dará error.
        if (dto.type) where.type = dto.type;
        // -------------

        if (dto.kioskId) where.terminalId = dto.kioskId;
        if (dto.cashierUserId) where.cashierId = dto.cashierUserId;

        if (dto.referenceContains) {
            where.items = {
                some: {
                    description: { contains: dto.referenceContains, mode: 'insensitive' }
                }
            }
        }

        // if (dto.childId) ...

        return where;
    }

    /**
     * V2: where con 'net' (Excluir anuladas)
     */
    private whereWithNet(dto: ReportQueryDto): Prisma.TransactionWhereInput {
        const net = this.toBoolean(dto.net);
        const base = this.baseWhere(dto);

        if (!net) return base;

        // V2: Si 'net' es true, solo queremos transacciones 'PAID'
        return {
            ...base,
            status: TransactionStatus.PAID,
        };
    }

    /**
     * V2: Lista transacciones (paginado)
     */
    async list(dto: ReportQueryDto) {
        const where = this.whereWithNet(dto);

        const page = Math.max(1, dto.page ?? 1);
        const size = Math.min(MAX_PAGE_SIZE, Math.max(1, dto.pageSize ?? 50));
        const skip = (page - 1) * size;

        const [rows, total, sums] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where,
                orderBy: { startedAt: 'desc' }, // V2: Usamos startedAt
                skip,
                take: size,
                include: {
                    items: { // V2: Incluimos los ítems
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    category: true,
                                    categoryRel: { select: { name: true } } // <-- New
                                }
                            }
                        }
                    },
                    // TODO (V2): Incluir cajero y terminal
                    // cashier: { select: { id: true, name: true } },
                    // terminal: { select: { id: true, name: true } },
                },
            }),
            this.prisma.transaction.count({ where }),
            this.prisma.transaction.groupBy({
                by: ['type'],
                where,
                orderBy: { type: 'asc' },
                _sum: {
                    totalCents: true, // V2: Sumamos totalCents
                },
            }),
        ]);

        // V2: Nombres de sumas actualizados
        const sumSale = sums.find(s => s.type === 'SALE')?._sum?.totalCents ?? 0;
        const sumRefund = sums.find(s => s.type === 'REFUND')?._sum?.totalCents ?? 0;

        return {
            rows, total,
            sumSale, sumRefund,
            page, pageSize: size,
        };
    }

    /**
     * V2: Exporta transacciones a CSV
     */
    async toCsv(dto: ReportQueryDto): Promise<string> {
        const header = [
            'id', 'type', 'status', 'paymentMethod', 'totalCents', 'isOffline', 'startedAt', 'completedAt',
            'terminalId', 'cashierId', 'externalRef',
            'itemsCount', 'itemsDescription'
        ].join(',');

        let out = header;
        let first = true;

        for await (const batch of this.iterTransactionsBatches(dto)) {
            const lines = batch.map(r => ([
                r.id,
                r.type,
                r.status,
                r.paymentMethod,
                r.totalCents,
                r.isOffline ? 'TRUE' : 'FALSE',
                r.startedAt.toISOString(),
                r.completedAt ? r.completedAt.toISOString() : '',
                r.terminalId,
                r.cashierId,
                r.externalRef ?? '',
                r.items.length,
                // Concatenamos las descripciones de los ítems
                r.items.map(item => `${item.quantity}x ${item.description}`).join(' | ')
                    .replace(/,/g, ' ').replace(/\n/g, ' ')
            ].join(',')));

            out += (first ? '\n' : '') + lines.join('\n');
            first = false;

            if (out.length > 40_000_000) break; // ~40MB
        }

        return out;
    }

    /**
     * V2: Iterador para CSV
     */
    private async *iterTransactionsBatches(dto: ReportQueryDto) {
        const where = this.whereWithNet(dto);
        let cursor: { id: number } | undefined;

        while (true) {
            const batch = await this.prisma.transaction.findMany({
                where,
                orderBy: { id: 'asc' },
                take: CSV_BATCH_SIZE,
                ...(cursor ? { cursor, skip: 1 } : {}),
                include: {
                    items: { select: { description: true, quantity: true } },
                },
            });

            if (batch.length === 0) break;
            yield batch;
            cursor = { id: batch[batch.length - 1].id };
        }
    }

    /**
     * V2: Reemplazo de 'listReversals'. Ahora lista Anulaciones (VOID) y Reembolsos (REFUND).
     */
    async listVoidsAndRefunds(dto: ReportQueryDto) {
        const where = this.baseWhere(dto);

        // Modificamos el 'where' para buscar solo VOID o REFUND
        where.type = { in: ['VOID', 'REFUND'] };

        const page = Math.max(1, dto.page ?? 1);
        const size = Math.min(MAX_PAGE_SIZE, Math.max(1, dto.pageSize ?? 50));
        const skip = (page - 1) * size;

        const [rows, total] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where,
                orderBy: { completedAt: 'desc' }, // Ordenar por fecha de completado
                skip,
                take: size,
                include: {
                    items: { select: { description: true, quantity: true } }
                }
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            rows, total, page, pageSize: size,
        };
    }

    // (Este lo implementaremos en el siguiente paso, similar a toCsv)
    async toCsvVoidsAndRefunds(dto: ReportQueryDto): Promise<string> {
        console.warn('[TODO] ReportsService.toCsvVoidsAndRefunds no implementado');
        return "id,type,status,totalCents\n";
    }


    /**
     * Hito G: Reporte de Rentabilidad (Ventas vs Costos)
     * (Este ya estaba implementado y es V2)
     */
    async getProfitabilitySummary(dto: ReportQueryDto) {
        const { fromUtc, toUtc } = this.toUtcRange(dto);

        // --- 1. Calcular Ventas Totales ---
        const salesData = await this.prisma.transaction.aggregate({
            where: {
                status: 'PAID',
                type: 'SALE',
                completedAt: { gte: fromUtc, lte: toUtc },
                ...(dto.kioskId ? { terminalId: dto.kioskId } : {}),
                ...(dto.cashierUserId ? { cashierId: dto.cashierUserId } : {}),
            },
            _sum: {
                totalCents: true,
            },
            _count: {
                id: true,
            },
        });

        // --- 2. Calcular Costos Totales (COGS) ---
        const stockMovements = await this.prisma.stockMovement.findMany({
            where: {
                type: 'SALE',
                createdAt: { gte: fromUtc, lte: toUtc },
                ...(dto.cashierUserId ? { userId: dto.cashierUserId } : {}),
            }
        });

        let totalCostCents = 0;
        for (const move of stockMovements) {
            const costOfMovement = (move.qtyDelta * (move.unitCostCentsSnapshot ?? 0));
            totalCostCents += costOfMovement;
        }
        totalCostCents = totalCostCents * -1; // Convertir a positivo

        // --- 2b. Calcular Gastos de Mercadería Recibida (Órdenes de Compra) ---
        const purchaseOrders = await this.prisma.purchaseOrder.aggregate({
            where: {
                status: 'RECEIVED',
                receivedAt: { gte: fromUtc, lte: toUtc },
            },
            _sum: {
                totalCostCents: true,
            },
        });
        const totalPurchaseCostCents = purchaseOrders._sum.totalCostCents ?? 0;

        // --- 2c. Calcular Mermas (WASTE) ---
        const wasteMovements = await this.prisma.stockMovement.findMany({
            where: {
                type: 'WASTE',
                createdAt: { gte: fromUtc, lte: toUtc },
            }
        });

        let totalWasteCents = 0;
        for (const move of wasteMovements) {
            const costOfMovement = (move.qtyDelta * (move.unitCostCentsSnapshot ?? 0));
            totalWasteCents += Math.abs(costOfMovement);
        }

        // --- 3. Calcular el Resultado ---
        const totalSalesCents = salesData._sum.totalCents ?? 0;
        const totalTransactions = salesData._count.id;
        const netProfitCents = totalSalesCents - totalCostCents - totalPurchaseCostCents - totalWasteCents;

        return {
            query: {
                from: fromUtc.toISOString(),
                to: toUtc.toISOString(),
            },
            summary: {
                totalSalesCents,
                totalCostCents: totalCostCents + totalPurchaseCostCents + totalWasteCents,
                totalWasteCents,
                netProfitCents,
                totalTransactions,
                marginPercentage: totalSalesCents > 0
                    ? parseFloat(((netProfitCents / totalSalesCents) * 100).toFixed(2))
                    : 0,
            },
        };
    }

    /**
     * Valorización de Inventario (Stock x Último Costo)
     */
    async getInventoryValuation() {
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            select: {
                id: true,
                stockQuantity: true,
                costCents: true,
                priceCents: true
            }
        });

        let totalValueCents = 0;
        let potentialRevenueCents = 0;

        for (const p of products) {
            totalValueCents += (p.stockQuantity * (p.costCents ?? 0));
            potentialRevenueCents += (p.stockQuantity * p.priceCents);
        }

        return {
            totalValueCents,
            potentialRevenueCents,
            potentialMarginCents: potentialRevenueCents - totalValueCents
        };
    }

    /**
     * GET /reports/top-products
     * Productos más vendidos en un rango de fechas
     */
    async getTopProducts(dto: ReportQueryDto) {
        const { fromUtc, toUtc } = this.toUtcRange(dto);

        const topProducts = await this.prisma.transactionItem.groupBy({
            by: ['productId'],
            where: {
                transaction: {
                    status: 'PAID',
                    type: 'SALE',
                    completedAt: { gte: fromUtc, lte: toUtc },
                    ...(dto.kioskId ? { terminalId: dto.kioskId } : {}),
                    ...(dto.cashierUserId ? { cashierId: dto.cashierUserId } : {}),
                },
                productId: { not: null },
            },
            _sum: {
                quantity: true,
                totalLineCents: true,
            },
            orderBy: dto.sortBy === 'revenue'
                ? { _sum: { totalLineCents: 'desc' } }
                : { _sum: { quantity: 'desc' } },
            take: 20,
        });

        // Obtener los nombres de los productos
        const productIds = topProducts.map(p => p.productId).filter(Boolean) as number[];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, category: true, costCents: true },
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Para calcular margen real necesitamos el costo promedio o snapshot si existe
        // Como estamos agrupando transacciones pasadas, puede ser difícil ser preciso al 100% 
        // sin recalcular ítem por ítem. Pero daremos un estimado basado en lastCostCents real del producto.

        let results = topProducts.map(item => {
            const product = productMap.get(item.productId!) || { name: 'desconocido', costCents: 0 };
            const subtotalCents = item._sum?.totalLineCents ?? 0;
            const quantity = item._sum?.quantity ?? 0;
            const totalCostCents = quantity * (product['costCents'] ?? 0);
            const marginCents = subtotalCents - totalCostCents;

            return {
                productId: item.productId,
                product: product,
                _sum: {
                    quantity,
                    subtotalCents,
                    marginCents,
                    marginPercentage: subtotalCents > 0 ? (marginCents / subtotalCents) * 100 : 0
                },
            };
        });

        if (dto.sortBy === 'margin') {
            results.sort((a, b) => b._sum.marginCents - a._sum.marginCents);
        }

        return results.slice(0, 10);
    }

    /**
     * Sugerencia de Pedido (Smart Suggestions)
     * Basado en stock mínimo y agrupado por proveedor.
     */
    async getPurchaseSuggestions() {
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                trackStock: true,
                stockQuantity: { lte: this.prisma.product.fields.minStockLevel } // Prisma 5.x+ support
            },
            include: {
                supplier: { select: { id: true, name: true } }
            },
            orderBy: {
                supplier: { name: 'asc' }
            }
        });

        // Agrupar por proveedor
        const suggestionsBySupplier: Record<string, any[]> = {};

        for (const p of products) {
            const supplierName = p.supplier?.name || 'Sin Proveedor';
            if (!suggestionsBySupplier[supplierName]) {
                suggestionsBySupplier[supplierName] = [];
            }
            suggestionsBySupplier[supplierName].push({
                id: p.id,
                name: p.name,
                currentStock: p.stockQuantity,
                minStock: p.minStockLevel,
                suggestedQty: Math.max(0, (p.minStockLevel * 2) - p.stockQuantity) // Sugerencia simple
            });
        }

        return suggestionsBySupplier;
    }
}