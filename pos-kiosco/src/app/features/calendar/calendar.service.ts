import { Injectable, inject, signal } from '@angular/core';
import { LocalDbService } from '../../core/services/local-db.service';

export interface CalendarEvent {
    id?: number;
    date: Date; // 00:00:00
    title: string;
    type: 'VISIT' | 'ORDER' | 'CUSTOM';
    color?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private db = inject(LocalDbService);

    async getCustomEvents(month: number, year: number): Promise<CalendarEvent[]> {
        // Simple implementación con LocalStorage por ahora
        const key = 'pos_calendar_events';
        const raw = localStorage.getItem(key);
        if (!raw) return [];

        try {
            const all = JSON.parse(raw);
            return all
                .map((e: any) => ({ ...e, date: new Date(e.date) })) // Revivir fechas
                .filter((e: CalendarEvent) =>
                    e.date.getMonth() === month &&
                    e.date.getFullYear() === year
                );
        } catch (e) {
            console.error('Error parsing events', e);
            return [];
        }
    }

    saveEvent(event: CalendarEvent) {
        const key = 'pos_calendar_events';
        const raw = localStorage.getItem(key);
        let all = raw ? JSON.parse(raw) : [];

        // Asignar ID simple
        if (!event.id) event.id = Date.now();

        all.push(event);
        localStorage.setItem(key, JSON.stringify(all));
    }

    deleteEvent(id: number) {
        const key = 'pos_calendar_events';
        const raw = localStorage.getItem(key);
        if (!raw) return;
        let all = JSON.parse(raw);
        all = all.filter((e: any) => e.id !== id);
        localStorage.setItem(key, JSON.stringify(all));
    }

    // Helper para parsear días de visita (muy básico por ahora)
    // "Lunes y Jueves" -> [1, 4]
    // Helper para parsear días (Legacy String o New JSON)
    getSupplierEvents(supplier: any, month: number, year: number): CalendarEvent[] {
        const visitDays = supplier.visitDays;
        if (!visitDays) return [];

        const events: CalendarEvent[] = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let orderDays: number[] = [];
        let deliveryDays: number[] = [];

        // 1. Detectar Formato
        if (visitDays.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(visitDays);
                orderDays = this.daysToNumbers(parsed.order || []);
                deliveryDays = this.daysToNumbers(parsed.delivery || []);
            } catch (e) {
                console.error('Error parsing visitDays JSON', e);
            }
        } else {
            // Legacy: Asumimos que todo es "Visita" (lo trataremos como Pedido/Order por defecto o genérico)
            orderDays = this.parseLegacyString(visitDays);
        }

        // 2. Generar Eventos
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayOfWeek = date.getDay(); // 0-6

            // Pedidos
            if (orderDays.includes(dayOfWeek)) {
                events.push({
                    date: date,
                    title: `Pedido ${supplier.name}`,
                    type: 'ORDER',
                    color: 'bg-blue-100 text-blue-700 border border-blue-200'
                });
            }

            // Entregas
            if (deliveryDays.includes(dayOfWeek)) {
                events.push({
                    date: date,
                    title: `Entrega ${supplier.name}`,
                    type: 'VISIT', // Usamos VISIT para entrega
                    color: 'bg-purple-100 text-purple-700 border border-purple-200'
                });
            }
        }

        return events;
    }

    private daysToNumbers(days: string[]): number[] {
        const map: { [key: string]: number } = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
        return days.map(d => map[d] ?? -1).filter(n => n !== -1);
    }

    private parseLegacyString(str: string): number[] {
        const days: number[] = [];
        const lower = str.toLowerCase();
        if (lower.includes('lunes')) days.push(1);
        if (lower.includes('martes')) days.push(2);
        if (lower.includes('miércoles') || lower.includes('miercoles')) days.push(3);
        if (lower.includes('jueves')) days.push(4);
        if (lower.includes('viernes')) days.push(5);
        if (lower.includes('sábado') || lower.includes('sabado')) days.push(6);
        if (lower.includes('domingo')) days.push(0);
        return days;
    }
}
