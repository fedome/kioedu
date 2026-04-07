import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { UiService } from '../../../core/services/ui.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
// IMPORTANTE: Importamos el Modal aquí porque la Lista LO USA
import { CategoryManagerModalComponent } from '../category-manager-modal/category-manager-modal';
import { ProductFormModalComponent } from '../product-form-modal/product-form-modal';
import { StockFormModalComponent } from '../stock-form-modal/stock-form-modal';
import { ReconcileModalComponent } from '../reconcile-modal/reconcile-modal';
import { ProductHistoryModalComponent } from '../product-history-modal/product-history-modal.component'; // Import
import { CategoriesService } from '../../../core/services/categories.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormModalComponent, StockFormModalComponent, CategoryManagerModalComponent, ProductHistoryModalComponent, ReconcileModalComponent],
  templateUrl: './product-list.html', // Asegúrate de que tu HTML se llame así
  styleUrls: ['./product-list.scss']
})
export class ProductListComponent implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private route = inject(ActivatedRoute);

  // --- SIGNALS para reactividad perfecta ---
  products = signal<any[]>([]);
  loading = signal(true);

  categories = signal<any[]>([]); // <-- Categories Signal
  // ----------------------------------------

  searchTerm = '';
  showModal = false;
  selectedProduct: any = null;

  showStockModal = false;
  selectedProductForStock: any = null;

  showHistoryModal = false; // <-- History Modal State
  selectedProductForHistory: any = null;

  showReconcileModal = false;
  selectedProductForReconcile: any = null;

  showCategoryManager = false; // <-- New Modal State

  // Filtros y Vista
  filterLowStock = false;
  filterCategory: number | 'ALL' = 'ALL'; // <-- Category Filter
  viewMode: 'grid' | 'list' = 'grid';     // <-- View Mode

  private searchSubject = new Subject<string>();
  private categoriesService = inject(CategoriesService);
  private confirm = inject(ConfirmService);

  // Paleta de colores para categorías (Consistente con POS)
  private readonly CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {};
  private readonly COLOR_PALETTE = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  ];

  ngOnInit() {
    this.ui.setPageTitle('Inventario', 'Gestión de productos y precios');

    // Cargar categorías
    this.loadCategories();

    // Leer query params para filtros
    this.route.queryParams.subscribe(params => {
      this.filterLowStock = params['filter'] === 'lowStock';
      if (this.filterLowStock) {
        this.ui.setPageTitle('Stock Bajo', 'Productos que requieren reposición');
      }
      this.loadProducts();
    });

    // Configuración del buscador
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.loadProducts(term);
    });
  }

  loadCategories() {
    this.categoriesService.getAll().subscribe(cats => this.categories.set(cats));
  }

  openCategoryManager() {
    this.showCategoryManager = true;
  }

  onCategoryManagerClosed() {
    this.showCategoryManager = false;
    this.loadCategories(); // Reload categories
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  clearLowStockFilter() {
    this.filterLowStock = false;
    this.ui.setPageTitle('Inventario', 'Gestión de productos y precios');
    this.loadProducts();
  }

  // Helper para filtrar en frontend si se desea, o para la vista
  get visibleProducts() {
    let list = this.products();

    // Filtro Categoría Frontend (rápido)
    if (this.filterCategory !== 'ALL') {
      list = list.filter(p => (p.categoryId || p.categoryRel?.id) === this.filterCategory);
    }

    // Fallback Frontend para Low Stock
    // (Por si el backend no lo filtra o queremos feedback inmediato)
    if (this.filterLowStock) {
      list = list.filter(p => p.stockQuantity <= (p.minStock || 5));
    }

    return list;
  }

  getCategoryColor(categoryName: string): { bg: string; text: string; border: string } {
    if (!categoryName) return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-100' };
    if (!this.CATEGORY_COLORS[categoryName]) {
      const idx = Object.keys(this.CATEGORY_COLORS).length % this.COLOR_PALETTE.length;
      this.CATEGORY_COLORS[categoryName] = this.COLOR_PALETTE[idx];
    }
    return this.CATEGORY_COLORS[categoryName];
  }

  loadProducts(search: string = '') {
    this.loading.set(true); // Spinner activado

    // Construir URL con filtros
    let url = `/products?search=${search}`;
    if (this.filterLowStock) {
      url += '&lowStock=true';
    }

    this.api.get<any[]>(url).subscribe({
      next: (data) => {
        this.products.set(data); // Actualiza la tabla al instante
        this.loading.set(false); // Spinner desactivado
      },
      error: (e) => {
        console.error('Error:', e);
        this.loading.set(false);
      }
    });
  }

  // --- Lógica del Modal ---
  openModal(product: any = null) {
    this.selectedProduct = product;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedProduct = null;
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadProducts(this.searchTerm); // Recargar lista
  }

  // --- Eliminar ---
  async deleteProduct(product: any) {
    const ok = await this.confirm.confirm({
      title: '¿Eliminar producto?',
      message: `Estás a punto de eliminar "${product.name}". Esta acción desactivará el producto del inventario.`,
      confirmText: 'Sí, eliminar',
      type: 'danger'
    });

    if (!ok) return;

    // Borrado optimista visual
    const currentList = this.products();
    this.products.set(currentList.filter(p => p.id !== product.id));

    this.api.delete(`/products/${product.id}`).subscribe({
      error: () => {
        this.ui.showToast('Error al eliminar el producto', 'error');
        this.products.set(currentList); // Deshacer si falla
      },
      next: () => {
        this.ui.showToast('Producto eliminado correctamente');
      }
    });
  }

  openStockModal(product: any) {
    this.selectedProductForStock = product;
    this.showStockModal = true;
  }

  closeStockModal() {
    this.showStockModal = false;
    this.selectedProductForStock = null;
  }

  openHistoryModal(product: any) {
    this.selectedProductForHistory = product;
    this.showHistoryModal = true;
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.selectedProductForHistory = null;
  }
  onStockSaved() {
    this.closeStockModal();
    this.loadProducts(this.searchTerm);
  }

  openReconcileModal(product: any) {
    this.selectedProductForReconcile = product;
    this.showReconcileModal = true;
  }

  closeReconcileModal() {
    this.showReconcileModal = false;
    this.selectedProductForReconcile = null;
  }

  onReconcileSaved() {
    this.closeReconcileModal();
    this.loadProducts(this.searchTerm);
  }
}
