import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService, CalendarEvent } from './calendar.service';
import { SuppliersService } from '../../core/services/suppliers.service';
import { FormsModule } from '@angular/forms';
import { CalendarEventModalComponent } from './calendar-event-modal/calendar-event-modal.component'; // Import
import { UiService } from '../../core/services/ui.service';

@Component({
    selector: 'app-calendar-page',
    standalone: true,
    imports: [CommonModule, FormsModule, CalendarEventModalComponent],
    templateUrl: './calendar-page.html',
})
export class CalendarPageComponent {
    private calendarService = inject(CalendarService);
    private suppliersService = inject(SuppliersService);
    private ui = inject(UiService);

    today = new Date();

    // Navigation
    currentMonth = signal(this.today.getMonth());
    currentYear = signal(this.today.getFullYear());
    viewMode = signal<'MONTH' | 'WEEK' | 'DAY'>('MONTH');

    // Filters
    showVisits = signal(true);
    showCustom = signal(true);

    // Data
    suppliersEvents = signal<CalendarEvent[]>([]);
    customEvents = signal<CalendarEvent[]>([]);

    // Modal State
    isModalOpen = false;
    selectedDate: Date = new Date();
    selectedEvent: CalendarEvent | undefined = undefined;

    // Computed: Días del mes para renderizar grid
    calendarDays = computed(() => {
        const year = this.currentYear();
        const month = this.currentMonth();

        // Logic for MONTH view
        const firstDayObj = new Date(year, month, 1);
        const lastDayObj = new Date(year, month + 1, 0);

        const daysInMonth = lastDayObj.getDate();
        const startDayOfWeek = firstDayObj.getDay(); // 0 Dom, 1 Lun...
        const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Hacer que empiece en Lunes

        return { daysInMonth, paddingDays, monthName: this.months[month] };
    });

    // UI Helpers
    months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    years = Array.from({ length: 10 }, (_, i) => this.today.getFullYear() - 5 + i);

    constructor() {
        this.ui.setPageTitle('Calendario', 'Gestión de visitas y eventos');
        this.loadData();
    }

    // --- NAVIGATION ---
    setMonth(index: number) {
        this.currentMonth.set(Number(index));
        this.loadData();
    }

    setYear(year: number) {
        this.currentYear.set(Number(year));
        this.loadData();
    }

    setView(mode: 'MONTH' | 'WEEK' | 'DAY') {
        this.viewMode.set(mode);
    }

    // --- DATA LOADING ---
    async loadData() {
        const year = this.currentYear();
        const month = this.currentMonth();

        // 1. Cargar Custom Events
        const customs = await this.calendarService.getCustomEvents(month, year);
        this.customEvents.set(customs);

        // 2. Obtener Proveedores y proyectar visitas
        this.suppliersService.getAll('').subscribe(suppliers => {
            let events: CalendarEvent[] = [];
            suppliers.forEach(supp => {
                const suppEvents = this.calendarService.getSupplierEvents(supp, month, year);
                events = events.concat(suppEvents);
            });
            this.suppliersEvents.set(events);
        });
    }

    // --- GETTERS ---
    getEventsForDay(day: number): CalendarEvent[] {
        const date = new Date(this.currentYear(), this.currentMonth(), day);

        let combined: CalendarEvent[] = [];
        if (this.showVisits()) combined = combined.concat(this.suppliersEvents());
        if (this.showCustom()) combined = combined.concat(this.customEvents());

        return combined.filter(e =>
            e.date.getDate() === day &&
            e.date.getMonth() === this.currentMonth() &&
            e.date.getFullYear() === this.currentYear()
        );
    }

    // --- MODAL HANDLING ---

    // Click en día vacío o botón +
    openAddModal(day: number, e?: Event) {
        if (e) e.stopPropagation();
        this.selectedDate = new Date(this.currentYear(), this.currentMonth(), day);
        this.selectedEvent = undefined; // New Mode
        this.isModalOpen = true;
    }

    // Click en evento existente
    openEventDetails(event: CalendarEvent, e: Event) {
        e.stopPropagation();
        this.selectedDate = event.date;
        this.selectedEvent = event;
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedEvent = undefined;
    }

    // Actions from Modal
    handleSaveEvent(content: string) {
        const newEvent: CalendarEvent = {
            date: this.selectedDate,
            title: content,
            type: 'CUSTOM',
            color: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        };
        // Si estamos editando (future enhancement), mantendríamos el ID
        this.calendarService.saveEvent(newEvent);
        this.loadData();
        this.closeModal();
    }

    handleDeleteEvent() {
        if (this.selectedEvent && this.selectedEvent.id) {
            this.calendarService.deleteEvent(this.selectedEvent.id);
            this.loadData();
            this.closeModal();
        }
    }

    goToToday() {
        this.currentMonth.set(this.today.getMonth());
        this.currentYear.set(this.today.getFullYear());
        this.loadData();
    }

    isToday(day: number): boolean {
        return day === this.today.getDate() &&
            this.currentMonth() === this.today.getMonth() &&
            this.currentYear() === this.today.getFullYear();
    }
}
