import { Component, EventEmitter, Input, Output, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier, SuppliersService } from '../../../core/services/suppliers.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-supplier-form-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './supplier-form-modal.html'
})
export class SupplierFormModalComponent {
    private fb = inject(FormBuilder);
    private suppliersService = inject(SuppliersService);
    private notifications = inject(NotificationService);

    @Input() isOpen = false;
    @Input() supplierToEdit?: Supplier;
    @Output() close = new EventEmitter<boolean>();

    form: FormGroup;
    isSubmitting = signal(false);

    constructor() {
        this.form = this.fb.group({
            name: ['', [Validators.required]],
            cuit: [''],
            phone: [''],
            email: ['', [Validators.email]],
            address: [''],
            visitDays: [''],
            contactInfo: [''] // Legacy / Notas
        });
    }

    // Days logic
    // Days logic
    weekDays = [
        { label: 'Lunes', value: 'Lunes' },
        { label: 'Martes', value: 'Martes' },
        { label: 'Miércoles', value: 'Miércoles' },
        { label: 'Jueves', value: 'Jueves' },
        { label: 'Viernes', value: 'Viernes' },
        { label: 'Sábado', value: 'Sábado' },
        { label: 'Domingo', value: 'Domingo' }
    ];

    selectedOrderDays: string[] = [];
    selectedDeliveryDays: string[] = [];

    toggleDay(day: string, type: 'order' | 'delivery') {
        if (type === 'order') {
            this.selectedOrderDays = this.toggleList(this.selectedOrderDays, day);
        } else {
            this.selectedDeliveryDays = this.toggleList(this.selectedDeliveryDays, day);
        }
        this.updateVisitDaysControl();
    }

    private toggleList(list: string[], item: string): string[] {
        if (list.includes(item)) {
            return list.filter(i => i !== item);
        } else {
            return [...list, item];
        }
    }

    isDaySelected(day: string, type: 'order' | 'delivery'): boolean {
        if (type === 'order') return this.selectedOrderDays.includes(day);
        return this.selectedDeliveryDays.includes(day);
    }

    private updateVisitDaysControl() {
        const data = {
            order: this.selectedOrderDays,
            delivery: this.selectedDeliveryDays
        };
        this.form.patchValue({ visitDays: JSON.stringify(data) });
    }

    ngOnChanges() {
        if (this.isOpen) {
            if (this.supplierToEdit) {
                this.form.patchValue(this.supplierToEdit);

                // Parse Logic for new object or legacy string
                const raw = this.supplierToEdit.visitDays || '';
                if (raw.trim().startsWith('{')) {
                    try {
                        const parsed = JSON.parse(raw);
                        this.selectedOrderDays = parsed.order || [];
                        this.selectedDeliveryDays = parsed.delivery || [];
                    } catch (e) {
                        console.error(e);
                        this.selectedOrderDays = [];
                        this.selectedDeliveryDays = [];
                    }
                } else {
                    // Legacy: treat as generic, maybe put in delivery? Let's clear for now or put in both?
                    // Let's parse the string and put it in Delivery (visita)
                    if (raw) {
                        // Simple split by comma/space logic is hard to replicate exactly from service
                        // Let's just clear or try basics
                        const parts = raw.split(/,| y | e /).map(s => s.trim());
                        // Filter valid days
                        this.selectedDeliveryDays = parts.filter(p => this.weekDays.some(w => w.value.toLowerCase().includes(p.toLowerCase()))); // Rough match
                        this.selectedOrderDays = [];
                    } else {
                        this.selectedOrderDays = [];
                        this.selectedDeliveryDays = [];
                    }
                }
            } else {
                this.form.reset();
                this.selectedOrderDays = [];
                this.selectedDeliveryDays = [];
            }
        }
    }

    save() {
        if (this.form.invalid) return;

        this.isSubmitting.set(true);
        const value = this.form.value;

        const request = this.supplierToEdit
            ? this.suppliersService.update(this.supplierToEdit.id, value)
            : this.suppliersService.create(value);

        request.subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.close.emit(true);
            },
            error: (err) => {
                this.notifications.error('Error', 'Error al guardar: ' + err.message);
                this.isSubmitting.set(false);
            }
        });
    }

    cancel() {
        this.close.emit(false);
    }
}
