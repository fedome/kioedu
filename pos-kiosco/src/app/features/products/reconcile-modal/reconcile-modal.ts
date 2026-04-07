import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LucideAngularModule, ShieldCheck, AlertCircle } from 'lucide-angular';

@Component({
    selector: 'app-reconcile-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './reconcile-modal.html'
})
export class ReconcileModalComponent {
    @Input() product: any;
    @Output() cancel = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    private productsService = inject(ProductsService);
    private notifications = inject(NotificationService);

    readonly ShieldIcon = ShieldCheck;
    readonly AlertIcon = AlertCircle;

    physicalStock: number | null = null;
    reason: string = '';
    loading = signal(false);

    async submit() {
        if (this.physicalStock === null || this.physicalStock < 0) {
            this.notifications.warning('Dato requerido', 'Debes ingresar el stock físico actual');
            return;
        }

        this.loading.set(true);
        try {
            await this.productsService.reconcile(this.product.id, this.physicalStock, this.reason);
            this.notifications.success('Inventario Ajustado', `El stock de ${this.product.name} ahora es ${this.physicalStock}`);
            this.saved.emit();
        } catch (error) {
            this.notifications.error('Error', 'No se pudo realizar la reconciliación');
        } finally {
            this.loading.set(false);
        }
    }
}
