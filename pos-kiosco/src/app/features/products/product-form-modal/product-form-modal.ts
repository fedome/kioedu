import { Component, EventEmitter, Input, Output, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { SuppliersService, Supplier } from '../../../core/services/suppliers.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CategoryManagerModalComponent } from '../category-manager-modal/category-manager-modal';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryManagerModalComponent],
  templateUrl: './product-form-modal.html', // Usé el nombre que me pasaste en tu snippet
  styleUrls: ['./product-form-modal.scss']
})
export class ProductFormModalComponent implements OnInit {
  @Input() product: any = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private api = inject(ApiService);
  private categoriesService = inject(CategoriesService);
  private suppliersService = inject(SuppliersService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  loading = false; // Loading simple para este botón

  // Categorías
  categories: Category[] = [];
  showCategoryManager = false;
  showUrlInput = false; // Toggle para URL manual

  // Proveedores
  suppliers: Supplier[] = [];

  // Modelo de datos
  formData: any = {
    name: '',
    barcode: '',
    categoryId: null, // ID numérico
    supplierId: null, // ID del proveedor principal
    minStock: 5,
    imageUrl: ''
  };

  generatingImage = false; // Estado para la generación de imagen

  async generateAIImage() {
    const productName = this.formData.name?.trim();
    if (!productName) {
      this.notifications.warning('Atención', 'Primero escribe el nombre del producto.');
      return;
    }

    this.generatingImage = true;

    try {
      let finalPrompt = productName + ", detailed product photography, white background, high quality, 4k";

      // Call backend AI to enhance the prompt
      try {
        const res: any = await firstValueFrom(this.api.post('/ai/enhance-prompt', { productName }));
        if (res?.prompt) {
          finalPrompt = res.prompt;
        }
      } catch (e) {
        console.warn('AI prompt enhancement unavailable, using fallback.', e);
      }

      const encodedName = encodeURIComponent(finalPrompt);
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodedName}?width=400&height=400&nologo=true&seed=${seed}`;

      this.formData.imageUrl = url;
      this.cdr.markForCheck(); // Forzar actualización de vista
    } catch (err) {
      console.error(err);
      this.notifications.error('Error', 'Hubo un error al generar la imagen.');
    } finally {
      this.generatingImage = false;
      this.cdr.markForCheck(); // Para el estado loading
    }
  }

  // Variables para la Calculadora
  priceInput: number | null = null;
  costInput: number | null = null;
  marginInput: number | null = null;

  ngOnInit() {
    this.loadCategories();
    this.loadSuppliers();

    if (this.product) {
      // Cargar datos existentes
      this.formData = {
        name: this.product.name,
        barcode: this.product.barcode,
        categoryId: this.product.categoryId || this.product.categoryRel?.id || null, // Prioridad a categoryId
        supplierId: this.product.supplierId || null,
        minStock: this.product.minStock ?? 5,
        imageUrl: this.product.imageUrl || ''
      };

      // Convertir centavos a pesos
      this.priceInput = this.product.priceCents / 100;
      this.costInput = (this.product.costCents || 0) / 100;

      // Calcular margen inicial
      this.calculateMargin();
    }
  }

  loadCategories() {
    this.categoriesService.getAll().subscribe({
      next: (res) => this.categories = res,
      error: (err) => console.error('Error cargando categorías', err)
    });
  }

  loadSuppliers() {
    this.suppliersService.getAll().subscribe({
      next: (res) => this.suppliers = res,
      error: (err) => console.error('Error cargando proveedores', err)
    });
  }

  openCategoryManager() {
    this.showCategoryManager = true;
  }

  onCategoryManagerClosed() {
    this.showCategoryManager = false;
    this.loadCategories(); // Recargar por si hubo cambios
  }

  // --- CALCULADORA ---

  // Se llama cuando cambias Costo o Margen
  calculatePrice() {
    if (this.costInput == null) return;

    const margin = this.marginInput || 0;
    const factor = 1 + (margin / 100);

    // Calculamos precio
    const rawPrice = this.costInput * factor;
    this.priceInput = parseFloat(rawPrice.toFixed(2));
  }

  // Se llama cuando cambias Precio Venta
  calculateMargin() {
    if (!this.costInput || this.costInput === 0 || !this.priceInput) {
      this.marginInput = 0;
      return;
    }

    // Calculamos margen
    const rawMargin = ((this.priceInput / this.costInput) - 1) * 100;
    this.marginInput = parseFloat(rawMargin.toFixed(2));
  }

  // --- GUARDAR ---

  submit() {
    if (!this.formData.name || !this.formData.barcode || !this.priceInput || this.priceInput < 0) {
      this.notifications.warning('Atención', 'Completa los campos obligatorios y verifica el precio.');
      return;
    }

    this.loading = true;

    const payload = {
      ...this.formData,
      // Aseguramos que se envie null si no hay categoria
      categoryId: this.formData.categoryId ? Number(this.formData.categoryId) : null,
      minStock: this.formData.minStock ?? 5,
      priceCents: Math.round(this.priceInput * 100),
      costCents: this.costInput ? Math.round(this.costInput * 100) : 0
    };

    const request$ = this.product
      ? this.api.patch(`/products/${this.product.id}`, payload)
      : this.api.post('/products', payload);

    request$.subscribe({
      next: () => {
        this.saved.emit();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.notifications.error('Error', err.error?.message || 'Error al guardar');
        this.loading = false;
      }
    });
  }
}
