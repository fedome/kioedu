import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { UiService } from '../../core/services/ui.service';
import {
    LucideAngularModule,
    ShieldAlert, TrendingUp, ShoppingBag, AlertCircle, Clock,
    DollarSign, ArrowUpCircle, LockKeyhole, UnlockKeyhole
} from 'lucide-angular';
import { firstValueFrom } from 'rxjs';

export interface AuditEvent {
    id: string;
    type: string;
    at: string;
    title: string;
    message: string;
    details: any;
}

@Component({
    selector: 'app-audit-feed',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './audit.html',
    styleUrls: ['./audit.scss']
})
export class AuditFeedComponent implements OnInit {
    private api = inject(ApiService);
    private ui = inject(UiService);

    readonly ShieldIcon = ShieldAlert;
    readonly TrendingIcon = TrendingUp;
    readonly BagIcon = ShoppingBag;
    readonly AlertIcon = AlertCircle;
    readonly ClockIcon = Clock;
    readonly SaleIcon = DollarSign;
    readonly TopupIcon = ArrowUpCircle;
    readonly LockIcon = LockKeyhole;
    readonly UnlockIcon = UnlockKeyhole;

    events = signal<AuditEvent[]>([]);
    isLoading = signal(false);

    // Filter
    activeFilter = signal<string | null>(null);

    get filteredEvents(): AuditEvent[] {
        const filter = this.activeFilter();
        if (!filter) return this.events();
        return this.events().filter(e => e.type === filter);
    }

    ngOnInit() {
        this.ui.setPageTitle('Monitor de Auditoría', 'Eventos del sistema en tiempo real');
        this.loadFeed();
    }

    async loadFeed() {
        this.isLoading.set(true);
        try {
            const data = await firstValueFrom(this.api.get<AuditEvent[]>('/audit/feed'));
            this.events.set(data || []);
        } catch (error) {
            this.ui.showToast('Error al cargar el feed de auditoría', 'error');
        } finally {
            this.isLoading.set(false);
        }
    }

    setFilter(type: string | null) {
        this.activeFilter.set(type === this.activeFilter() ? null : type);
    }

    getIcon(type: string) {
        switch (type) {
            case 'SALE': return this.SaleIcon;
            case 'TOPUP': return this.TopupIcon;
            case 'PRICE_CHANGE': return this.TrendingIcon;
            case 'VOID_SALE': return this.AlertIcon;
            case 'CASH_ADJUSTMENT': return this.ShieldIcon;
            case 'STOCK_RECONCILE': return this.BagIcon;
            case 'SESSION_OPEN': return this.UnlockIcon;
            case 'SESSION_CLOSE': return this.LockIcon;
            default: return this.ClockIcon;
        }
    }

    getIconClass(type: string) {
        switch (type) {
            case 'SALE': return 'text-emerald-500 bg-emerald-50';
            case 'TOPUP': return 'text-indigo-500 bg-indigo-50';
            case 'PRICE_CHANGE': return 'text-blue-500 bg-blue-50';
            case 'VOID_SALE': return 'text-red-500 bg-red-50';
            case 'CASH_ADJUSTMENT': return 'text-amber-500 bg-amber-50';
            case 'STOCK_RECONCILE': return 'text-teal-500 bg-teal-50';
            case 'SESSION_OPEN': return 'text-green-500 bg-green-50';
            case 'SESSION_CLOSE': return 'text-slate-500 bg-slate-100';
            default: return 'text-slate-500 bg-slate-50';
        }
    }
}
