import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { UiService } from '../../core/services/ui.service';
import { ChargeModal } from '../pos/balance/charge-modal';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { TransactionsService } from '../../core/services/transactions.service';
import { CalendarService, CalendarEvent } from '../calendar/calendar.service';
import { SuppliersService } from '../../core/services/suppliers.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ChargeModal, BaseChartDirective],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private transactionsService = inject(TransactionsService);
  private calendarService = inject(CalendarService);
  private suppliersService = inject(SuppliersService);

  showChargeModal = false;

  // Signals
  metrics = signal({
    totalSales: 0,
    transactions: 0,
    cashSales: 0,
    cardSales: 0,
    mpSales: 0,
    transferSales: 0,
    lowStockItems: 0,
    currentCash: 0,
  });

  todayDeliveries = signal<CalendarEvent[]>([]);
  expiringProducts = signal<any[]>([]);

  // Chart Properties
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 0, left: 10, right: 10 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        titleFont: { size: 13, weight: 'bold', family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Ventas: $ ${(ctx.parsed.y || 0).toLocaleString('es-AR')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11, weight: 'bold' }, color: '#94a3b8' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(241, 245, 249, 0.5)' },
        ticks: {
          font: { family: 'Inter', size: 10, weight: 'bold' },
          color: '#cbd5e1',
          callback: (value) => '$' + value
        },
        border: { display: false }
      }
    },
    elements: {
      line: {
        tension: 0.45,
        borderWidth: 3,
        borderColor: '#6366f1',
        fill: true,
        backgroundColor: (ctx) => {
          const canvas = ctx.chart.canvas;
          const _ctx = canvas.getContext('2d');
          if (!_ctx) return 'rgba(99, 102, 241, 0.1)';
          const gradient = _ctx.createLinearGradient(0, 0, 0, 250);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
          gradient.addColorStop(0.6, 'rgba(99, 102, 241, 0.05)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return gradient;
        }
      },
      point: {
        radius: 0,
        hitRadius: 20,
        hoverRadius: 6,
        hoverBorderWidth: 4,
        hoverBackgroundColor: '#6363f1',
        hoverBorderColor: '#fff'
      }
    }
  };

  public chartType: ChartType = 'line';
  public chartData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [] }]
  };

  get hasChartData(): boolean {
    const data = this.chartData.datasets?.[0]?.data || [];
    return data.some((v: any) => (typeof v === 'number' ? v : 0) > 0);
  }

  ngOnInit() {
    this.ui.setPageTitle('Dashboard', 'Resumen del turno actual');
    this.loadDashboardData();
    this.loadWeeklySales();
    this.loadTodayDeliveries();
  }

  loadDashboardData() {
    // 1. Productos
    this.api.get<any>('/products/dashboard-metrics').subscribe({
      next: (data) => {
        this.metrics.update(curr => ({
          ...curr,
          lowStockItems: data.lowStockItems
        }));
        this.expiringProducts.set(data.expiringSoon);
      },
      error: (e) => console.error('Error stock metrics:', e)
    });

    // 2. Caja y Ventas
    this.api.get<any>('/cash-sessions/summary').subscribe({
      next: (data) => {
        const breakdown = data.salesBreakdown || {
          salesCash: 0,
          salesCard: 0,
          salesMP: 0,
          salesTransfer: 0,
          txCount: 0
        };
        const initialFloat = data.session?.openingBalanceCents ?? data.session?.initialCashCents ?? 0;
        const movementsSum = data.movs?.reduce((acc: number, m: any) => acc + (m._sum?.amount || 0), 0) || 0;
        const realCashInDrawer = initialFloat + movementsSum;

        this.metrics.update(curr => ({
          ...curr,
          totalSales: (breakdown.salesCash + breakdown.salesCard + breakdown.salesMP + breakdown.salesTransfer) / 100,
          cashSales: (breakdown.salesCash || 0) / 100,
          cardSales: (breakdown.salesCard || 0) / 100,
          mpSales: (breakdown.salesMP || 0) / 100,
          transferSales: (breakdown.salesTransfer || 0) / 100,
          transactions: breakdown.txCount || 0,
          currentCash: realCashInDrawer / 100
        }));
      },
      error: async (err) => {
        if (err.status === 404 || err.status === 0) {
          console.warn('Session summary failed, calculating locally');
          // Calculate from local DB for today
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);

          const todaySales = await this.transactionsService['db'].transactions
            .where('date').above(startOfDay)
            .toArray();

          const total = todaySales.reduce((acc, tx) => acc + tx.totalCents, 0);
          const count = todaySales.length;
          // Estimate breakdown (simplified for fallback)
          const cash = todaySales.filter(tx => tx.paymentMethod === 'CASH').reduce((acc, tx) => acc + tx.totalCents, 0);
          const wallet = todaySales.filter(tx => tx.paymentMethod === 'ACCOUNT' || tx.paymentMethod === 'TRANSFER').reduce((acc, tx) => acc + tx.totalCents, 0);

          this.metrics.update(curr => ({
            ...curr,
            totalSales: total / 100,
            cashSales: cash / 100,
            accountSales: wallet / 100,
            transactions: count,
            currentCash: (total / 100) // Rough estimate if no session info
          }));
        }
      }
    });
  }

  loadTodayDeliveries() {
    this.suppliersService.getAll().subscribe({
      next: (suppliers) => {
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();
        const day = today.getDate();

        let allTodayEvents: CalendarEvent[] = [];

        suppliers.forEach(s => {
          const events = this.calendarService.getSupplierEvents(s, month, year);
          const todayEvents = events.filter(e =>
            e.date.getDate() === day &&
            e.date.getMonth() === month &&
            e.date.getFullYear() === year
          );
          allTodayEvents = [...allTodayEvents, ...todayEvents];
        });

        // Solo nos interesan las entregas (VISIT en el servicio actual)
        this.todayDeliveries.set(allTodayEvents.filter(e => e.type === 'VISIT' || e.title.toLowerCase().includes('entrega')));
      }
    });
  }

  loadWeeklySales() {
    // Obtenemos transacciones de los últimos 7 días
    // TransactionsService.getLatestTransactions trae por defecto 30 días, nos sirve.
    this.transactionsService.getLatestTransactions(500).subscribe({
      next: (data: any) => {
        // data.data (paginado) o data (array directo). Asumimos array o estructura paginada.
        // Si API devuelve { data: [], total: ... } verificamos.
        // Revisando API, suele devolver Array directo o paginado. Vamos a ir seguros.
        const transactions = Array.isArray(data) ? data : (data.data || []);

        this.processChartData(transactions);
      },
      error: (err) => console.error('Error loading sales chart', err)
    });
  }

  processChartData(transactions: any[]) {
    // Agrupar ventas por día (últimos 7 días)
    const dailyTotals = new Map<string, number>();
    const today = new Date();
    const last7Days: string[] = [];
    const labels: string[] = [];

    // Inicializar mapa con 0 para los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyTotals.set(key, 0);

      // Label bonito: "Lun 24"
      const dayName = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
      labels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      last7Days.push(key);
    }

    // Sumar transacciones
    transactions.forEach(tx => {
      if (tx.type === 'SALE' || tx.type === 'PURCHASE') { // Ajustar según tipos backend
        const dateKey = new Date(tx.createdAt || tx.date).toISOString().split('T')[0];
        if (dailyTotals.has(dateKey)) {
          const current = dailyTotals.get(dateKey) || 0;
          // Asumimos amountCents o totalCents
          const amount = (tx.amountCents ?? tx.totalCents ?? 0) / 100;
          dailyTotals.set(dateKey, current + Math.abs(amount)); // Ventas suelen ser positivas o negativas, asegurar absoluto si es necesario
        }
      }
    });

    // Construir array de datos
    const data = last7Days.map(key => dailyTotals.get(key) || 0);

    // Actualizar Chart
    this.chartData = {
      labels: labels,
      datasets: [{
        data: data,
        label: 'Ventas',
        pointRadius: 0,
        fill: true
      }]
    };

    // Forzar update
    this.chart?.update();
  }

  openChargeModal() {
    this.showChargeModal = true;
  }

  closeChargeModal() {
    this.showChargeModal = false;
  }

  onChargeSuccess() {
    this.showChargeModal = false;
    this.loadDashboardData();
  }

  getDaysColor(days: number): string {
    if (days <= 2) return 'bg-red-100 text-red-700 border-red-200';
    if (days <= 7) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}
