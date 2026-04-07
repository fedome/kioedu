import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';
import { ProductsService } from '../../../core/services/products.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-stock-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-form-modal.html'
})
export class StockFormModalComponent {
  @Input() product: any;
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>(); // Avisa para recargar la tabla

  private api = inject(ApiService);
  private productsService = inject(ProductsService); // Inject ProductsService
  private notifications = inject(NotificationService);

  loading = false;
  mode: 'add' | 'remove' | 'set' = 'add'; // Estado del tab

  // Modelo simple para la carga
  formData = {
    quantity: null as number | null,
    costInput: null as number | null, // Visual en Pesos
    expirationDate: '', // String YYYY-MM-DD
    notes: ''
  };

  setMode(m: 'add' | 'remove' | 'set') {
    this.mode = m;
    this.formData.quantity = null; // Limpiar al cambiar
  }

  submit() {
    if (!this.formData.quantity || this.formData.quantity < 0) {
      if (this.mode === 'set' && this.formData.quantity === 0) {
        // Permitir 0 en modo ajuste (stock cero)
      } else {
        this.notifications.warning('Cantidad Inválida', 'Ingresa una cantidad válida mayor a 0');
        return;
      }
    }

    this.loading = true;

    // Calcular el delta según el modo
    let finalQuantity = this.formData.quantity || 0;

    if (this.mode === 'remove') {
      finalQuantity = -Math.abs(finalQuantity);
    } else if (this.mode === 'set') {
      // Ajuste: Quiero que el stock final sea X.
      // Delta = Deseado - Actual
      const currentStock = this.product.stockQuantity || 0;
      finalQuantity = finalQuantity - currentStock;

      if (finalQuantity === 0) {
        this.notifications.info('Sin cambios', 'El stock actual ya es igual al deseado.');
        this.loading = false;
        this.saved.emit();
        return;
      }
    }

    // Call ProductsService instead of direct API
    const reason = this.formData.notes || (this.mode === 'add' ? 'Ingreso Manual' : (this.mode === 'remove' ? 'Baja Manual' : 'Ajuste de Inventario'));

    this.productsService.updateStock(
      this.product.id,
      finalQuantity,
      reason,
      this.formData.costInput || undefined,
      this.formData.expirationDate || undefined
    ).then(() => {
      this.loading = false;
      let msg = '';
      if (this.mode === 'add') msg = `+${this.formData.quantity} unidades`;
      else if (this.mode === 'remove') msg = `${-finalQuantity} unidades`; // Sale con menos
      else msg = `Stock ajustado a ${this.formData.quantity}`;

      this.notifications.success('Stock Actualizado', `${msg} en ${this.product.name}`);
      this.saved.emit();
    }).catch(err => {
      console.error(err);
      this.notifications.error('Error', err.error?.message || 'Error al cargar stock');
      this.loading = false;
    });
  }
}

