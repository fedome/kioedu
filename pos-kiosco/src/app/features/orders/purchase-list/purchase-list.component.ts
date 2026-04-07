import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseOrdersService, PurchaseOrder } from '../../../core/services/purchase-orders.service';
import { AddToDraftModalComponent } from '../add-to-draft-modal/add-to-draft-modal.component';
import { ReceiveOrderModalComponent } from '../receive-order-modal/receive-order-modal.component';
import { NotificationService } from '../../../core/services/notification.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
    selector: 'app-purchase-list',
    standalone: true,
    imports: [CommonModule, AddToDraftModalComponent, ReceiveOrderModalComponent],
    templateUrl: './purchase-list.html',
})
export class PurchaseListComponent {
    private poService = inject(PurchaseOrdersService);
    private notifications = inject(NotificationService);
    private ui = inject(UiService);

    orders = signal<PurchaseOrder[]>([]);
    loading = signal(true);

    // Modales
    showAddModal = false;
    showReceiveModal = false;
    selectedSupplierIdForAdd?: number;
    selectedOrderId?: number;
    activeFilter = signal<'DRAFT' | 'SUBMITTED'>('DRAFT');

    filteredOrders = computed(() => {
        return this.orders().filter(o => o.status === this.activeFilter());
    });

    submittedCount = computed(() => {
        return this.orders().filter(o => o.status === 'SUBMITTED').length;
    });

    constructor() {
        this.ui.setPageTitle('Lista de Compras', 'Gestión de pedidos a proveedores');
        this.loadOrders();
    }

    loadOrders() {
        this.loading.set(true);
        this.poService.getAll().subscribe({
            next: (data: PurchaseOrder[]) => {
                this.orders.set(data);
                this.loading.set(false);
            },
            error: (err: any) => {
                console.error(err);
                this.loading.set(false);
            }
        });
    }

    setFilter(filter: 'DRAFT' | 'SUBMITTED') {
        this.activeFilter.set(filter);
    }

    openAddModal(supplierId?: number) {
        this.selectedSupplierIdForAdd = supplierId;
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        this.selectedSupplierIdForAdd = undefined;
    }

    openReceiveModal(orderId: number) {
        this.selectedOrderId = orderId;
        this.showReceiveModal = true;
    }

    closeReceiveModal() {
        this.showReceiveModal = false;
        this.selectedOrderId = undefined;
        this.loadOrders();
    }

    onAddItem(event: { supplierId: number, productId: number, quantity: number }) {
        this.poService.addToDraft(event.supplierId, event.productId, event.quantity).subscribe({
            next: () => {
                this.notifications.success('Éxito', 'Producto agregado a la lista');
                this.closeAddModal();
                this.loadOrders();
            },
            error: (err) => {
                console.error(err);
                this.notifications.error('Error', 'No se pudo agregar el producto');
            }
        });
    }

    submitOrder(orderId: number) {
        this.poService.submitOrder(orderId).subscribe({
            next: () => {
                this.notifications.success('Pedido Enviado', 'La orden pasó a estado pendiente de entrega.');
                this.loadOrders();
            }
        });
    }

    getWhatsappLink(order: PurchaseOrder): string {
        if (!order.supplier?.phone) return '';

        // Limpieza de teléfono (asumiendo lógica de SupplierList)
        let phone = order.supplier.phone.replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '549' + phone;

        // Construcción del mensaje
        let message = `Hola ${order.supplier.name}! Te paso un pedido:\n\n`;
        order.items.forEach((item: any) => {
            // item type might be issue if not imported correctly, using any or ensure PurchaseOrderItem
            message += `• ${item.quantity} x ${item.product?.name || 'Producto'}\n`;
        });
        message += `\nGracias!`;

        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
}
