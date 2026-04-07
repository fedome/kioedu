import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../core/services/ui.service';
import { ReportsService, SalesReportData } from '../../core/services/reports.service';
import { ProductsService } from '../../core/services/products.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import * as XLSX from 'xlsx';
import { forkJoin, map } from 'rxjs';

type DateRange = 'today' | 'week' | 'month' | 'custom';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, BaseChartDirective],
    templateUrl: './reports.html'
})
export class ReportsComponent implements OnInit {
    private ui = inject(UiService);
    private reportsService = inject(ReportsService);
    private productsService = inject(ProductsService);

    // Estado
    loading = signal(false);
    selectedRange = signal<DateRange>('today');
    trendMetric = signal<'sales' | 'ticket'>('sales');
    topProductsSortBy = signal<'quantity' | 'margin' | 'revenue'>('quantity');

    // Datos
    reportData = signal<SalesReportData | null>(null);
    prevReportData = signal<SalesReportData | null>(null);
    cashSessions = signal<any[]>([]);
    projection = signal<number>(0);
    criticalProducts = signal<any[]>([]);
    inventoryValuation = signal<any>(null);
    totalWaste = signal<number>(0);

    // Comparativas (Deltas)
    salesDelta = signal<number>(0);
    ticketDelta = signal<number>(0);
    profitDelta = signal<number>(0);

    // Heatmap Data
    heatmapData = signal<{ day: string, hour: number, value: number }[]>([]);

    // Fechas personalizadas
    customFrom = '';
    customTo = '';

    // Charts Configuration
    public salesTrendData: ChartConfiguration<'line'>['data'] = {
        labels: [],
        datasets: [
            {
                data: [],
                label: 'Ventas ($)',
                fill: true,
                tension: 0.4,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#6366f1'
            }
        ]
    };
    public salesTrendOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: {
                borderWidth: 3,
                borderCapStyle: 'round',
                borderJoinStyle: 'round'
            },
            point: {
                radius: 4,
                hitRadius: 10,
                hoverRadius: 6,
                borderWidth: 2
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 16,
                titleFont: { size: 14, family: "'Inter', sans-serif", weight: 'bold' },
                bodyFont: { size: 13, family: "'Inter', sans-serif" },
                cornerRadius: 12,
                displayColors: true,
                boxPadding: 6,
                callbacks: {
                    label: (context) => {
                        if (context.parsed && context.parsed.y !== null) {
                            return ` $ ${context.parsed.y.toLocaleString('es-AR')}`;
                        }
                        return '';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                border: { display: false, dash: [4, 4] },
                grid: { color: '#f1f5f9', tickLength: 0 },
                ticks: {
                    callback: (value) => '$' + Number(value).toLocaleString('es-AR', { notation: 'compact' }),
                    font: { size: 11, family: "'Inter', sans-serif", weight: 500 },
                    color: '#94a3b8',
                    padding: 12
                }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    font: { size: 11, family: "'Inter', sans-serif", weight: 500 },
                    color: '#94a3b8',
                    padding: 12
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    public ticketTrendData: ChartConfiguration<'line'>['data'] = {
        labels: [],
        datasets: [
            {
                data: [],
                label: 'Ticket Promedio ($)',
                fill: true,
                tension: 0.4,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff'
            }
        ]
    };

    public ticketTrendOptions: ChartOptions<'line'> = {
        ...this.salesTrendOptions,
        plugins: {
            ...this.salesTrendOptions.plugins,
            tooltip: {
                ...this.salesTrendOptions.plugins?.tooltip as any,
                backgroundColor: 'rgba(5, 150, 105, 0.9)',
            }
        }
    };

    public paymentMethodData: ChartConfiguration<'doughnut'>['data'] = {
        labels: ['Efectivo', 'Cuenta Corriente'],
        datasets: [
            {
                data: [0, 0],
                backgroundColor: ['#10b981', '#3b82f6'],
                hoverBackgroundColor: ['#059669', '#2563eb'],
                borderWidth: 0
            }
        ]
    };
    public paymentMethodOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (context) => {
                        const value = Number(context.parsed);
                        const dataArr = context.chart.data.datasets[context.datasetIndex].data as number[];
                        const total = dataArr.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        return ` $ ${value.toLocaleString('es-AR')} (${percentage})`;
                    }
                }
            }
        }
    };



    public categorySalesData: ChartConfiguration<'pie'>['data'] = {
        labels: [],
        datasets: [
            {
                data: [],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'],
                borderWidth: 0
            }
        ]
    };
    public categorySalesOptions: ChartOptions<'pie'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12 } } },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context) => {
                        const value = Number(context.parsed);
                        const total = context.dataset.data.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        return ` $ ${value.toLocaleString('es-AR')} (${percentage})`;
                    }
                }
            }
        }
    };


    ngOnInit() {
        this.ui.setPageTitle('Reportes', 'Análisis de ventas');
        this.loadReport();
        this.loadSessions();
    }

    loadSessions() {
        this.reportsService.getCashSessions(5).subscribe(sessions => {
            this.cashSessions.set(sessions);
        });
    }

    onRangeChange(range: DateRange) {
        this.selectedRange.set(range);
        if (range !== 'custom') {
            this.loadReport();
        }
    }

    onSortByChange(sortBy: 'quantity' | 'margin' | 'revenue') {
        this.topProductsSortBy.set(sortBy);
        this.loadReport();
    }

    loadReport() {
        this.loading.set(true);
        let dateRange: { from: Date; to: Date };
        let prevRange: { from: Date; to: Date };

        switch (this.selectedRange()) {
            case 'today':
                dateRange = this.reportsService.getTodayRange();
                // Ayer
                prevRange = {
                    from: new Date(dateRange.from.getTime() - 86400000),
                    to: new Date(dateRange.to.getTime() - 86400000)
                };
                break;
            case 'week':
                dateRange = this.reportsService.getWeekRange();
                // Semana previa
                prevRange = {
                    from: new Date(dateRange.from.getTime() - 7 * 86400000),
                    to: new Date(dateRange.to.getTime() - 7 * 86400000)
                };
                break;
            case 'month':
                dateRange = this.reportsService.getMonthRange();
                // Mes previo
                const d = new Date(dateRange.from);
                d.setMonth(d.getMonth() - 1);
                prevRange = {
                    from: new Date(d),
                    to: new Date(dateRange.from.getTime() - 1000)
                };
                break;
            case 'custom':
                if (!this.customFrom || !this.customTo) {
                    this.loading.set(false);
                    return;
                }
                dateRange = {
                    from: new Date(this.customFrom + 'T00:00:00'),
                    to: new Date(this.customTo + 'T23:59:59')
                };
                // Por simplicidad en custom no comparamos o comparamos mismo lapso atás
                const diff = dateRange.to.getTime() - dateRange.from.getTime();
                prevRange = {
                    from: new Date(dateRange.from.getTime() - diff),
                    to: new Date(dateRange.to.getTime() - diff)
                };
                break;
        }

        forkJoin({
            current: this.reportsService.getSalesReport(dateRange.from, dateRange.to, this.topProductsSortBy()),
            previous: this.reportsService.getSalesReport(prevRange.from, prevRange.to, this.topProductsSortBy()),
            profit: this.reportsService.getProfitability(dateRange.from, dateRange.to),
            prevProfit: this.reportsService.getProfitability(prevRange.from, prevRange.to),
            products: this.productsService.getAllProducts().then(prods => prods.filter(p => (p.stockQuantity || 0) <= (p.minStockLevel || 5))),
            inventory: this.reportsService.getInventoryValuation()
        }).subscribe({
            next: (res: any) => {
                const data = res.current;
                data.totalCost = res.profit.summary.totalCostCents / 100;
                data.netProfit = res.profit.summary.netProfitCents / 100;
                data.marginPercentage = res.profit.summary.marginPercentage;
                data.totalWaste = (res.profit.summary.totalWasteCents || 0) / 100;

                this.reportData.set(data);
                this.prevReportData.set(res.previous);
                this.inventoryValuation.set(res.inventory);
                this.totalWaste.set(data.totalWaste);

                this.updateCharts(data);
                this.calculateDeltas(data, res.previous, res.profit.summary, res.prevProfit.summary);
                this.calculateProjection(data);
                this.calculateHeatmap(data);

                // Mezclar stock bajo con los más vendidos
                const lowStock = res.products;
                const topIds = data.topProducts.map((p: any) => p.productId);
                this.criticalProducts.set(lowStock.filter((p: any) => topIds.includes(p.id)).slice(0, 5));

                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error cargando reportes:', err);
                this.loading.set(false);
            }
        });
    }

    calculateDeltas(current: SalesReportData, prev: SalesReportData, profit: any, prevProfit: any) {
        const calc = (cur: number, pre: number) => pre > 0 ? ((cur - pre) / pre) * 100 : 0;
        this.salesDelta.set(calc(current.totalSales, prev.totalSales));
        this.ticketDelta.set(calc(current.averageTicket, prev.averageTicket));
        this.profitDelta.set(calc(profit.netProfitCents, prevProfit.netProfitCents));
    }

    calculateProjection(data: SalesReportData) {
        if (this.selectedRange() !== 'month') {
            this.projection.set(0);
            return;
        }
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        this.projection.set((data.totalSales / currentDay) * daysInMonth);
    }

    calculateHeatmap(data: SalesReportData) {
        if (data.heatmap) {
            this.heatmapData.set(data.heatmap);
        } else {
            this.heatmapData.set([]);
        }
    }

    getHeatmapColor(val: number) {
        if (val > 15) return 'bg-indigo-600';
        if (val > 8) return 'bg-indigo-400';
        if (val > 3) return 'bg-indigo-200';
        if (val > 0) return 'bg-indigo-50';
        return 'bg-slate-100/50';
    }

    getHeatmapValue(day: string, hour: number): number {
        const found = this.heatmapData().find(d => d.day === day && d.hour === hour);
        return found ? Math.round(found.value) : 0;
    }

    setTrendMetric(metric: 'sales' | 'ticket') {
        this.trendMetric.set(metric);
        // Metric is now shown together, so we don't need to trigger re-update here
        // but we keep the signal if needed for other UI parts.
    }

    updateCharts(data: SalesReportData) {
        // Shared Labels
        let labels: string[] = [];
        const isToday = this.selectedRange() === 'today';

        // Temporary Arrays
        const salesValues: number[] = [];
        const ticketValues: number[] = [];

        if (isToday) {
            // Fill hours from 8 to 21
            for (let h = 8; h <= 21; h++) {
                labels.push(`${h}:00`);
                const hourData = data.salesByHour.find(sh => sh.hour === h);
                salesValues.push(hourData ? hourData.sales : 0);
                ticketValues.push(hourData && hourData.transactions > 0 ? hourData.sales / hourData.transactions : 0);
            }
        } else {
            const sortedDaily = [...data.dailySales].sort((a, b) => a.date.localeCompare(b.date));
            if (sortedDaily.length > 0) {
                const start = new Date(sortedDaily[0].date + 'T12:00:00');
                const end = new Date(sortedDaily[sortedDaily.length - 1].date + 'T12:00:00');

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const dailyData = sortedDaily.find(sd => sd.date === dateStr);

                    labels.push(d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }));
                    salesValues.push(dailyData ? dailyData.sales : 0);
                    ticketValues.push(dailyData && dailyData.transactions > 0 ? dailyData.sales / dailyData.transactions : 0);
                }
            }
        }

        // 1. Update Sales Chart
        this.salesTrendData = {
            labels: labels,
            datasets: [{
                ...this.salesTrendData.datasets[0],
                data: salesValues,
                label: 'Ventas ($)'
            }]
        };

        // 2. Update Ticket Chart
        this.ticketTrendData = {
            labels: labels,
            datasets: [{
                ...this.ticketTrendData.datasets[0],
                data: ticketValues,
                label: 'Ticket Promedio ($)'
            }]
        };

        // Update Payment Methods
        this.paymentMethodData = {
            ...this.paymentMethodData,
            datasets: [{
                ...this.paymentMethodData.datasets[0],
                data: [data.cashSales, data.accountSales]
            }]
        };

        // Update Sales By Category
        const cats = (data.salesByCategory || []).slice(0, 8);
        this.categorySalesData = {
            ...this.categorySalesData,
            labels: cats.map(c => c.category),
            datasets: [{
                ...this.categorySalesData.datasets[0],
                data: cats.map(c => c.sales)
            }]
        };
    }

    // Calcular el máximo para las barras de progreso
    getMaxProductSales(): number {
        const data = this.reportData();
        if (!data || !data.topProducts.length) return 1;
        return Math.max(...data.topProducts.map(p => p.totalSales));
    }

    hasChartData(): boolean {
        const data = this.reportData();
        return data !== null && data.totalTransactions > 0;
    }

    getRangeLabel(): string {
        switch (this.selectedRange()) {
            case 'today': return 'Hoy';
            case 'week': return 'Últimos 7 días';
            case 'month': return 'Este mes';
            case 'custom': return 'Personalizado';
        }
    }

    exportToExcel() {
        const data = this.reportData();
        if (!data) return;

        const wb = XLSX.utils.book_new();

        // 1. Resumen General
        const summaryData = [
            ['Reporte de Ventas', this.getRangeLabel()],
            ['Fecha Generación', new Date().toLocaleDateString('es-AR')],
            [''],
            ['Métrica', 'Valor'],
            ['Ventas Totales', data.totalSales],
            ['Transacciones', data.totalTransactions],
            ['Ticket Promedio', data.averageTicket],
            ['Efectivo', data.cashSales],
            ['Cta. Corriente', data.accountSales]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

        // 2. Ventas Diarias
        if (data.dailySales.length > 0) {
            const dailyData = [
                ['Fecha', 'Ventas', 'Transacciones'],
                ...data.dailySales.map(d => [d.date, d.sales, d.transactions])
            ];
            const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
            XLSX.utils.book_append_sheet(wb, wsDaily, 'Ventas Diarias');
        }

        // 3. Top Productos
        if (data.topProducts.length > 0) {
            const productsData = [
                ['Producto', 'Cantidad', 'Ventas Totales'],
                ...data.topProducts.map(p => [p.productName, p.quantity, p.totalSales])
            ];
            const wsProducts = XLSX.utils.aoa_to_sheet(productsData);
            XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Productos');
        }

        // 4. Ventas por Categoría (Nuevo)
        if (data.salesByCategory && data.salesByCategory.length > 0) {
            const catData = [
                ['Categoría', 'Cantidad', 'Ventas'],
                ...data.salesByCategory.map(c => [c.category, c.quantity, c.sales])
            ];
            const wsCats = XLSX.utils.aoa_to_sheet(catData);
            XLSX.utils.book_append_sheet(wb, wsCats, 'Ventas por Categoría');
        }

        // Descargar
        XLSX.writeFile(wb, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}
