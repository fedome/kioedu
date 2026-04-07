import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseOrdersService, PurchaseOrder } from '../../../core/services/purchase-orders.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-receive-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 class="text-xl font-bold text-slate-800 tracking-tight">Recibir Mercadería</h2>
            <p class="text-slate-500 text-xs mt-0.5">Confirmar lo recibido de <b>{{ order?.supplier?.name }}</b></p>
          </div>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-6">
          @if (loading) {
            <div class="flex justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          } @else {
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th class="px-4 py-3">Producto</th>
                    <th class="px-4 py-3 text-center">Pedido</th>
                    <th class="px-4 py-3 text-center">Recibido</th>
                    <th class="px-4 py-3 text-right">Costo Unit. ($)</th>
                    <th class="px-4 py-3">Lote / Factura</th>
                    <th class="px-4 py-3">Vencimiento</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of receivedItems; track item.productId) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-3 font-medium text-slate-700">{{ item.name }}</td>
                      <td class="px-4 py-3 text-center text-slate-400 font-mono">{{ item.orderedQty }}</td>
                      <td class="px-4 py-3">
                        <input type="number" [(ngModel)]="item.quantity" 
                          class="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-center font-bold text-indigo-700">
                      </td>
                      <td class="px-4 py-3">
                        <input type="number" [(ngModel)]="item.unitCost" 
                          class="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-right">
                      </td>
                      <td class="px-4 py-3">
                        <input type="text" [(ngModel)]="item.batchNumber" placeholder="N° Lote"
                          class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
                      </td>
                      <td class="px-4 py-3">
                        <input type="date" [(ngModel)]="item.expirationDate" 
                          class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3">
          <button (click)="close.emit()" class="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button (click)="submit()" [disabled]="submitting" 
            class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2">
            @if (submitting) {
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            }
            Confirmar Recepción
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    input[type="number"]::-webkit-inner-spin-button, 
    input[type="number"]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
  `]
})
export class ReceiveOrderModalComponent implements OnInit {
  @Input() orderId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() received = new EventEmitter<void>();

  private poService = inject(PurchaseOrdersService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  order: any = null;
  receivedItems: any[] = [];
  loading = true;
  submitting = false;

  ngOnInit() {
    this.loadOrder();
  }

  loadOrder() {
    this.poService.getAll().subscribe({
      next: (orders) => {
        this.order = orders.find(o => o.id === this.orderId);
        if (this.order) {
          this.receivedItems = this.order.items.map((item: any) => ({
            productId: item.productId,
            name: item.product?.name || 'Producto',
            orderedQty: item.quantity,
            quantity: item.quantity,
            unitCost: item.unitCostCents / 100,
            batchNumber: '',
            expirationDate: null
          }));
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notifications.error('Error', 'No se pudo cargar la orden');
        this.close.emit();
      }
    });
  }

  submit() {
    this.submitting = true;

    const payload = this.receivedItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCostCents: Math.round(item.unitCost * 100),
      batchNumber: item.batchNumber,
      expirationDate: item.expirationDate
    }));

    this.poService.receiveOrder(this.orderId, payload).subscribe({
      next: () => {
        this.notifications.success('Recibido', 'El stock ha sido actualizado correctamente.');
        this.received.emit();
        this.submitting = false;
      },
      error: (err) => {
        console.error(err);
        this.notifications.error('Error', 'Ocurrió un error al procesar la recepción.');
        this.submitting = false;
      }
    });
  }
}
