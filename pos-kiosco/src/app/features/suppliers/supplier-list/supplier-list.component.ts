import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';
import { SuppliersService, Supplier } from '../../../core/services/suppliers.service';
import { SupplierFormModalComponent } from '../supplier-form-modal/supplier-form-modal.component';
import { UiService } from '../../../core/services/ui.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-supplier-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SupplierFormModalComponent],
    templateUrl: './supplier-list.html',
})
export class SupplierListComponent {
    private suppliersService = inject(SuppliersService);
    private ui = inject(UiService);
    private confirmService = inject(ConfirmService);
    private notifications = inject(NotificationService);

    searchControl = new FormControl('');
    suppliers = signal<Supplier[]>([]);
    loading = signal(true);

    // Estado del modal
    isFormOpen = signal(false);
    selectedSupplier = signal<Supplier | undefined>(undefined);

    constructor() {
        this.ui.setPageTitle('Distribuidores', 'Gestión de proveedores logísticos');
        this.searchControl.valueChanges.pipe(
            startWith(''),
            debounceTime(300),
            // distinctUntilChanged(), // Comentado para permitir recargas con mismo filtro
            switchMap(query => {
                this.loading.set(true);
                return this.suppliersService.getAll(query ?? '');
            })
        ).subscribe({
            next: (data) => {
                this.suppliers.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    refreshList() {
        // Truco para disparar el valueChanges sin cambiar el valor, 
        // o simplemente llamamos al servicio pero lo ideal es pasar por el pipe
        this.searchControl.setValue(this.searchControl.value);
    }

    openForm(supplier?: Supplier) {
        this.selectedSupplier.set(supplier);
        this.isFormOpen.set(true);
    }

    onFormClose(refresh: boolean) {
        this.isFormOpen.set(false);
        this.selectedSupplier.set(undefined);
        if (refresh) {
            this.refreshList();
        }
    }

    getWhatsappNumber(phone: string): string {
        const clean = phone.replace(/[^0-9]/g, '');
        // Si empieza con 11 y tiene 10 dígitos, asumimos que es AMBA y le falta el 549
        if (clean.length === 10 && clean.startsWith('11')) {
            return '549' + clean;
        }
        // Si tiene 10 dígitos (interior), también agregamos 549
        if (clean.length === 10) {
            return '549' + clean;
        }
        return clean;
    }

    async delete(supplier: Supplier) {
        const ok = await this.confirmService.confirm({
            title: 'Eliminar distribuidor',
            message: `¿Estás seguro de eliminar a ${supplier.name}?`,
            confirmText: 'Eliminar',
            type: 'danger'
        });
        
        if (ok) {
            this.suppliersService.delete(supplier.id).subscribe({
                next: () => {
                    this.suppliers.update(list => list.filter(item => item.id !== supplier.id));
                    this.notifications.success('Éxito', 'Distribuidor eliminado');
                },
                error: (err) => this.notifications.error('Error', 'Error al eliminar: ' + (err.error?.message || err.message))
            });
        }
    }

    formatVisitDays(visitDays: string): string {
        if (!visitDays) return '';

        // 1. Try Parse JSON
        if (visitDays.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(visitDays);
                const orders = (parsed.order || []).join(', ');
                const deliveries = (parsed.delivery || []).join(', ');

                let result = '';
                if (orders) result += `Pedidos: ${orders}. `;
                if (deliveries) result += `Entregas: ${deliveries}.`;
                return result || 'Sin días definidos';
            } catch (e) {
                return visitDays; // Fallback to raw string if parse fails
            }
        }

        // 2. Legacy String
        return visitDays;
    }
}
