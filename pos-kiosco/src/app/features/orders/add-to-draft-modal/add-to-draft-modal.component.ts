import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { SuppliersService, Supplier } from '../../../core/services/suppliers.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'app-add-to-draft-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 class="font-bold text-lg text-slate-800">Agregar a Lista</h3>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto">
          
          <!-- Selección de Proveedor (si no viene pre-seleccionado) -->
          <div *ngIf="!preSelectedSupplierId">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Proveedor</label>
            <select [(ngModel)]="selectedSupplierId" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all">
              <option [ngValue]="null" disabled>Seleccionar...</option>
              <option *ngFor="let s of suppliers()" [ngValue]="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div *ngIf="preSelectedSupplierId" class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700 text-sm font-medium">
             Agregando a lista de: <strong>{{ getSupplierName(preSelectedSupplierId) }}</strong>
          </div>

          <!-- Buscador de Productos -->
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
            <input [formControl]="searchControl" type="text" placeholder="Buscar por nombre o código..." 
                   class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all">
            
            <!-- Resultados -->
            <div *ngIf="searchResults().length > 0" class="mt-2 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                <div *ngFor="let p of searchResults()" 
                     (click)="selectProduct(p)"
                     class="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                     [class.bg-indigo-50]="selectedProduct?.id === p.id">
                    <span class="text-sm text-slate-700 truncate mr-2">{{ p.name }}</span>
                    <span class="text-xs text-slate-400 font-mono bg-slate-100 px-1 py-0.5 rounded">{{ p.stockQuantity }} stock</span>
                </div>
            </div>
            <div *ngIf="selectedProduct" class="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Seleccionado: {{ selectedProduct.name }}
            </div>
          </div>

          <!-- Cantidad -->
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad a Pedir</label>
            <div class="flex items-center gap-3">
                <button (click)="adjustQty(-1)" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">-</button>
                <input [(ngModel)]="quantity" type="number" class="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-center font-bold text-lg outline-none focus:border-indigo-500">
                <button (click)="adjustQty(1)" class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">+</button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button (click)="close.emit()" class="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button (click)="confirm()" 
                  [disabled]="!isValid()"
                  class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95">
            Agregar
          </button>
        </div>
      </div>
    </div>
  `
})
export class AddToDraftModalComponent {
    @Input() preSelectedSupplierId?: number;
    @Output() close = new EventEmitter<void>();
    @Output() add = new EventEmitter<{ supplierId: number, productId: number, quantity: number }>();

    private productsService = inject(ProductsService);
    private suppliersService = inject(SuppliersService);

    suppliers = signal<Supplier[]>([]);
    selectedSupplierId: number | null = null;

    // Búsqueda Productos
    searchControl = new FormControl('');
    searchResults = signal<any[]>([]);
    selectedProduct: any = null;

    quantity = 10;

    constructor() {
        this.loadSuppliers();

        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(term => {
            if (!term || term.length < 2) {
                this.searchResults.set([]);
                return;
            }
            this.searchProducts(term);
        });
    }

    ngOnInit() {
        if (this.preSelectedSupplierId) {
            this.selectedSupplierId = this.preSelectedSupplierId;
        }
    }

    async loadSuppliers() {
        this.suppliersService.getAll('').subscribe(list => this.suppliers.set(list));
    }

    async searchProducts(term: string) {
        // Usamos la API de productos existente. Asumimos que devuelve Promise<Product[]> o similar
        // Adaptar según tu ProductsService real
        try {
            const all = await this.productsService.getAllProducts();
            // Filtrado simple en cliente si la API trae todo, o llamada a endpoint de búsqueda
            // Por simplicidad filtraré 'all' ya que getAllProducts suele traer todo en offline first
            const filtered = (all as any[]).filter(p =>
                p.name.toLowerCase().includes(term.toLowerCase()) ||
                p.barcode.includes(term)
            ).slice(0, 10);
            this.searchResults.set(filtered);
        } catch (e) {
            console.error(e);
        }
    }

    selectProduct(p: any) {
        this.selectedProduct = p;
        this.searchResults.set([]); // Limpiar resultados para UX limpia
        this.searchControl.setValue(p.name, { emitEvent: false });
    }

    adjustQty(delta: number) {
        this.quantity = Math.max(1, this.quantity + delta);
    }

    getSupplierName(id: number): string {
        return this.suppliers().find(s => s.id === id)?.name || 'Desconocido';
    }

    isValid(): boolean {
        return !!this.selectedSupplierId && !!this.selectedProduct && this.quantity > 0;
    }

    confirm() {
        if (this.isValid()) {
            this.add.emit({
                supplierId: this.selectedSupplierId!,
                productId: this.selectedProduct.id,
                quantity: this.quantity
            });
        }
    }
}
