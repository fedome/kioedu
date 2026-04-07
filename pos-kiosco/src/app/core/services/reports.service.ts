import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface SalesReportData {
    totalSales: number;
    totalTransactions: number;
    cashSales: number;
    accountSales: number;
    averageTicket: number;
    topProducts: TopProduct[];
    salesByHour: HourlySales[];
    dailySales: DailySales[];
    salesByCategory: CategorySales[];
    // Profitability
    totalCost?: number;
    netProfit?: number;
    marginPercentage?: number;
    totalWaste?: number;
    heatmap?: { day: string; hour: number; value: number }[];
}

export interface CategorySales {
    category: string;
    sales: number;
    quantity: number;
}

export interface TopProduct {
    productId: number;
    productName: string;
    quantity: number;
    totalSales: number;
    marginCents?: number;
    marginPercentage?: number;
}

export interface HourlySales {
    hour: number;
    sales: number;
    transactions: number;
}

export interface DailySales {
    date: string;
    sales: number;
    transactions: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private api = inject(ApiService);

    // Obtener resumen de ventas por rango de fechas
    getSalesReport(from: Date, to: Date, sortBy: string = 'quantity'): Observable<SalesReportData> {
        const params = {
            from: from.toISOString(),
            to: to.toISOString(),
            sortBy
        };

        return forkJoin({
            transactions: this.api.get<any>('/reports/transactions', { ...params, pageSize: 1000 }).pipe(
                catchError(() => of({ rows: [], total: 0 }))
            ),
            topProducts: this.api.get<any>('/reports/top-products', params).pipe(
                catchError(() => of([]))
            )
        }).pipe(
            map(({ transactions, topProducts }) => {
                const txList = transactions.rows || [];

                // Calcular totales
                let totalSales = 0;
                let cashSales = 0;
                let accountSales = 0;
                const salesByHour: { [key: number]: { sales: number; transactions: number } } = {};
                const salesByDate: { [key: string]: { sales: number; transactions: number } } = {};
                const salesByCategory: { [key: string]: { sales: number; quantity: number } } = {};
                const heatmapMatrix: { [key: string]: number } = {};
                const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

                let processedTransactions = 0;

                for (const tx of txList) {
                    if (tx.status === 'VOIDED') continue;

                    // Validar fecha (soportar camelCase y snake_case)
                    // Backend usa startedAt / completedAt
                    const dateStr = tx.startedAt || tx.completedAt || tx.createdAt || tx.created_at;
                    if (!dateStr) continue;

                    const txDate = new Date(dateStr);
                    if (isNaN(txDate.getTime())) continue;

                    const amount = (tx.totalCents || tx.total_cents || 0) / 100;
                    if (amount === 0 && tx.total) {
                        // Fallback si viene como total directo
                        totalSales += Number(tx.total);
                    } else {
                        totalSales += amount;
                    }

                    if (tx.childId || tx.child_id) {
                        accountSales += amount;
                    } else {
                        cashSales += amount;
                    }

                    // Ventas por hora
                    const hour = txDate.getHours();
                    if (!salesByHour[hour]) {
                        salesByHour[hour] = { sales: 0, transactions: 0 };
                    }
                    salesByHour[hour].sales += amount;
                    salesByHour[hour].transactions += 1;

                    // Ventas por día
                    const dateKey = txDate.toISOString().split('T')[0];
                    if (!salesByDate[dateKey]) {
                        salesByDate[dateKey] = { sales: 0, transactions: 0 };
                    }
                    salesByDate[dateKey].sales += amount;
                    salesByDate[dateKey].transactions += 1;

                    // Heatmap (Concurrencia)
                    if (hour >= 8 && hour <= 20) {
                        const dayName = daysOfWeek[txDate.getDay()];
                        const hmKey = `${dayName}-${hour}`;
                        heatmapMatrix[hmKey] = (heatmapMatrix[hmKey] || 0) + 1;
                    }

                    // Ventas por Categoría (Iterar items)
                    if (tx.items && Array.isArray(tx.items)) {
                        for (const item of tx.items) {
                            const cat = item.product?.categoryRel?.name ?? item.product?.category ?? 'Sin Categoría';
                            if (!salesByCategory[cat]) {
                                salesByCategory[cat] = { sales: 0, quantity: 0 };
                            }
                            // item.totalLineCents es lo mejor, si existe. Si no, unitPrice * qty
                            const lineTotal = (item.totalLineCents || (item.unitPriceCents * item.quantity) || 0) / 100;
                            salesByCategory[cat].sales += lineTotal;
                            salesByCategory[cat].quantity += (item.quantity || 0);
                        }
                    }

                    processedTransactions++;
                }

                const heatmapData = [];
                for (const d of daysOfWeek) {
                    for (let h = 8; h <= 20; h++) {
                        heatmapData.push({
                            day: d,
                            hour: h,
                            value: heatmapMatrix[`${d}-${h}`] || 0
                        });
                    }
                }

                return {
                    totalSales,
                    totalTransactions: processedTransactions,
                    cashSales,
                    accountSales,
                    averageTicket: processedTransactions > 0 ? totalSales / processedTransactions : 0,
                    topProducts: (topProducts || []).slice(0, 10).map((p: any) => ({
                        productId: p.productId,
                        productName: p.product?.name || 'Desconocido',
                        quantity: p._sum?.quantity || p.quantity || 0,
                        totalSales: ((p._sum?.subtotalCents || 0) / 100) || p.totalSales || 0,
                        marginCents: p._sum?.marginCents || 0,
                        marginPercentage: p._sum?.marginPercentage || 0
                    })),
                    salesByHour: Object.entries(salesByHour)
                        .map(([hour, data]) => ({
                            hour: parseInt(hour),
                            sales: data.sales,
                            transactions: data.transactions
                        }))
                        .sort((a, b) => a.hour - b.hour),
                    dailySales: Object.entries(salesByDate)
                        .map(([date, data]) => ({
                            date,
                            sales: data.sales,
                            transactions: data.transactions
                        }))
                        .sort((a, b) => a.date.localeCompare(b.date)),
                    salesByCategory: Object.entries(salesByCategory)
                        .map(([category, data]) => ({
                            category,
                            sales: data.sales,
                            quantity: data.quantity
                        }))
                        .sort((a, b) => b.sales - a.sales),
                    heatmap: heatmapData
                };
            })
        );
    }

    // Helpers para rangos de fechas comunes
    getTodayRange(): { from: Date; to: Date } {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        return { from, to };
    }

    getWeekRange(): { from: Date; to: Date } {
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        const from = new Date();
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        return { from, to };
    }

    getMonthRange(): { from: Date; to: Date } {
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        const from = new Date();
        from.setDate(1); // Primer día del mes
        from.setHours(0, 0, 0, 0);
        return { from, to };
    }

    getProfitability(from: Date, to: Date): Observable<any> {
        return this.api.get('/reports/profitability', { from: from.toISOString(), to: to.toISOString() });
    }

    getCashSessions(limit: number = 5): Observable<any[]> {
        return this.api.get('/cash-sessions', { limit });
    }

    getInventoryValuation(): Observable<any> {
        return this.api.get('/reports/inventory-valuation');
    }
}
