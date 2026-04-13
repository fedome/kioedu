import { Component, inject, OnInit, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UiService } from '../../../core/services/ui.service';
import { ApiService } from '../../../core/api/api.service';
import { OpenSessionModalComponent } from '../session/open-session/open-session-modal';
import { PaymentModalComponent } from '../payment-modal/payment-modal';
import { PrintingService } from '../../../core/services/printing.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ProductsService } from '../../../core/services/products.service';
import { StudentsService } from '../../../core/services/students.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { PurchaseOrdersService } from '../../../core/services/purchase-orders.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LocalDbService } from '../../../core/services/local-db.service';
import { SyncService } from '../../../core/services/sync.service';

interface Product {
  id: number;
  name: string;
  priceCents: number;
  stockQuantity: number;
  barcode: string;
  minStock?: number;
  imageUrl?: string;
  category?: string;
  categoryRel?: { id: number; name: string };
  supplierId?: number;
  supplierName?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// Interfaz para el alumno
interface Student {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  accounts?: {
    id: number;
    balanceCents: number;
  }[];
}

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [CommonModule, FormsModule, OpenSessionModalComponent, PaymentModalComponent],
  templateUrl: './sale.html',
  styleUrls: ['./sale.scss']
})
export class SaleComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  private ui = inject(UiService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private printingService = inject(PrintingService);
  private notifications = inject(NotificationService);
  private settings = inject(SettingsService);
  // Servicios Offline
  private productsService = inject(ProductsService);
  private studentsService = inject(StudentsService);
  private transactionsService = inject(TransactionsService);
  private confirm = inject(ConfirmService);
  private localDb = inject(LocalDbService);
  private syncService = inject(SyncService);

  // --- VARIABLES DE ESTADO ---
  products: Product[] = [];
  cart: CartItem[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  // Favoritos (Persistencia Local)
  favoriteProductIds: Set<number> = new Set();

  // Control de Modales
  showPaymentModal = false;
  isSessionClosed = false;
  qrCodeUrl: string | undefined = undefined;

  // --- ESTADO DEL ALUMNO ---
  selectedStudent: Student | null = null;

  // --- FILTRO DE CATEGORÍA ---
  selectedCategory: string | null = null;

  // Paleta de colores para categorías
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
    this.ui.setPageTitle('Punto de Venta', 'Nueva venta');
    this.loadFavorites(); // Cargar favoritos guardados
    this.loadProducts();
    this.checkSessionStatus();

    // Manejar producto escaneado desde otra página
    this.route.queryParams.subscribe(params => {
      const productId = params['addProduct'];
      if (productId) {
        this.addProductById(parseInt(productId, 10));
      }
    });
  }

  // --- FAVORITOS (Quick Grid Logic) ---

  loadFavorites() {
    try {
      const saved = localStorage.getItem('pos_favorite_products');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          this.favoriteProductIds = new Set(ids);
        }
      }
    } catch (e) {
      console.error('Error cargando favoritos', e);
    }
  }

  toggleFavorite(product: Product, event?: Event) {
    if (event) {
      event.stopPropagation(); // Evitar click en la card
    }

    if (this.favoriteProductIds.has(product.id)) {
      this.favoriteProductIds.delete(product.id);
      this.notifications.info('Favoritos', 'Producto removido de acceso rápido');
    } else {
      if (this.favoriteProductIds.size >= 12) {
        this.notifications.warning('Límite alcanzado', 'Máximo 12 productos favoritos');
        return;
      }
      this.favoriteProductIds.add(product.id);
      this.notifications.success('Favoritos', 'Producto agregado a acceso rápido');
    }
    this.saveFavorites();
  }

  isFavorite(product: Product): boolean {
    return this.favoriteProductIds.has(product.id);
  }

  saveFavorites() {
    localStorage.setItem('pos_favorite_products', JSON.stringify(Array.from(this.favoriteProductIds)));
  }

  // --- PRODUCT LIST HELPERS ---

  // Productos rápidos: Muestra LOS FAVORITOS primero
  get quickProducts(): Product[] {
    // 1. Obtener productos marcados como favoritos
    const favs = this.products.filter(p => this.favoriteProductIds.has(p.id));

    // 2. Si hay menos de 10 favoritos, rellenar con los primeros de la lista general (opcional, o dejar solo favs)
    // El usuario pidió "Grid de los 8-12 productos más vendidos", aqui lo hacemos manual.
    // Si prefiere SOLO favoritos, quitamos el relleno. Vamos a dejar solo favoritos para que sea limpio.
    return favs;
  }

  // Agregar producto por ID (usado cuando viene del scanner global)
  private route = inject(ActivatedRoute);

  private addProductById(productId: number) {
    // Esperar a que los productos se carguen
    const checkAndAdd = () => {
      const product = this.products.find(p => p.id === productId);
      if (product) {
        this.addToCart(product);
      } else if (this.isLoading) {
        // Reintentar si aún está cargando
        setTimeout(checkAndAdd, 200);
      }
    };
    checkAndAdd();
  }

  // --- GETTERS ---
  get filteredProducts(): Product[] {
    const term = this.searchTerm.toLowerCase();
    let filtered = this.products.filter(p =>
      p.name.toLowerCase().includes(term) || p.barcode.includes(term)
    );
    if (this.selectedCategory) {
      filtered = filtered.filter(p => (p.categoryRel?.name || 'Sin Categoría') === this.selectedCategory);
    }
    return filtered;
  }

  get categories(): string[] {
    const cats = new Set(this.products.map(p => p.categoryRel?.name || 'Sin Categoría'));
    return Array.from(cats).sort();
  }

  getCategoryColor(categoryName: string): { bg: string; text: string; border: string } {
    if (!this.CATEGORY_COLORS[categoryName]) {
      const idx = Object.keys(this.CATEGORY_COLORS).length % this.COLOR_PALETTE.length;
      this.CATEGORY_COLORS[categoryName] = this.COLOR_PALETTE[idx];
    }
    return this.CATEGORY_COLORS[categoryName];
  }

  selectCategory(cat: string | null) {
    this.selectedCategory = this.selectedCategory === cat ? null : cat;
  }

  get total(): number {
    const totalCents = this.cart.reduce((acc, item) => acc + (item.product.priceCents * item.quantity), 0);
    return totalCents / 100;
  }

  getProductStockClass(product: Product): string {
    if (product.stockQuantity === 0) return 'text-red-500 font-bold';
    if (product.stockQuantity <= (product.minStock || 5)) return 'text-orange-500 font-bold';
    return 'text-green-600';
  }

  // --- GESTIÓN DE SESIÓN ---
  checkSessionStatus() {
    this.api.get('/cash-sessions/summary').subscribe({
      next: () => {
        // Envolver en setTimeout para evitar NG0100 si esto ocurre durante la inicialización
        setTimeout(() => {
          this.isSessionClosed = false;
          this.ui.isOnline.set(true);
        });
      },
      error: (err) => {
        setTimeout(() => {
          if (err.status === 404) {
            this.isSessionClosed = true;
          } else {
            console.error('Error de conexión:', err);
            this.ui.isOnline.set(false);
          }
        });
      }
    });
  }

  onSessionOpened() {
    this.isSessionClosed = false;
    this.notifications.success('Caja Abierta', '¡Listo para vender!');
    this.checkSessionStatus();
  }

  // --- LÓGICA DE PRODUCTOS Y CARRITO ---

  loadProducts() {
    this.isLoading = true;
    this.productsService.getAllProducts()
      .then(data => {
        this.products = data as Product[]; // Cast necesario si la interfaz difiere ligeramente
        this.isLoading = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error('Error cargando productos', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  addToCart(product: Product, skipFocus = false) {
    const existingItem = this.cart.find(i => i.product.id === product.id);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (currentQtyInCart + 1 > product.stockQuantity) {
      this.notifications.warning('Stock Insuficiente', `Solo quedan ${product.stockQuantity} unidades`);
      return;
    }

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.push({ product: product, quantity: 1 });
    }

    this.searchTerm = '';
    if (!skipFocus) {
      this.focusSearch();
    }
  }

  removeFromCart(productId: number) {
    this.cart = this.cart.filter(i => i.product.id !== productId);
  }

  updateQuantity(productId: number, delta: number) {
    const item = this.cart.find(i => i.product.id === productId);
    if (item) {
      const newQty = item.quantity + delta;

      if (delta > 0 && newQty > item.product.stockQuantity) {
        this.notifications.warning('Stock Insuficiente', `Solo quedan ${item.product.stockQuantity} unidades`);
        return;
      }

      if (newQty > 0) {
        item.quantity = newQty;
      }
    }
  }

  async clearCart() {
    if (this.cart.length === 0) return;

    const ok = await this.confirm.confirm({
      title: '¿Vaciar carrito?',
      message: 'Se eliminarán todos los productos seleccionados y el alumno vinculado.',
      confirmText: 'Sí, vaciar',
      type: 'warning'
    });

    if (ok) {
      this.resetCart();
      this.notifications.info('Carrito', 'Carrito vaciado');
    }
  }

  // Resetea el carrito sin preguntar (para después de vender)
  resetCart() {
    this.cart = [];
    this.selectedStudent = null;
    this.isStudentScanned = false;
  }

  // --- LÓGICA DE ALUMNOS (SOLO POR TARJETA RFID) ---

  isStudentScanned = false;

  // Global RFID scan buffer: USB RFID readers type chars very fast (<50ms between keystrokes) and end with Enter
  private rfidBuffer = '';
  private rfidLastKeystroke = 0;

  @HostListener('document:keypress', ['$event'])
  handleRfidScan(event: KeyboardEvent) {
    const now = Date.now();

    // If more than 100ms between keystrokes, reset buffer (it's a human typing)
    if (now - this.rfidLastKeystroke > 100) {
      this.rfidBuffer = '';
    }
    this.rfidLastKeystroke = now;

    if (event.key === 'Enter') {
      // If we have 4+ chars typed in quick succession, it's an RFID scan
      if (this.rfidBuffer.length >= 4) {
        event.preventDefault();
        event.stopPropagation();
        // Clear the product search input in case chars leaked into it
        this.searchTerm = '';
        this.onRfidScan(this.rfidBuffer);
      }
      this.rfidBuffer = '';
    } else {
      this.rfidBuffer += event.key;
    }
  }

  /**
   * Llamado por el sistema de escaneo RFID cuando se detecta una tarjeta.
   * Busca al alumno por el UID de la tarjeta y lo selecciona automáticamente.
   */
  onRfidScan(cardUid: string) {
    this.isStudentScanned = true;
    this.studentsService.search(cardUid)
      .then((results: Student[]) => {
        if (results.length >= 1) {
          this.selectStudent(results[0]);
        } else {
          this.notifications.warning('No encontrado', 'Tarjeta no registrada en el sistema');
          this.isStudentScanned = false;
        }
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error(err);
        this.notifications.error('Error', 'Error buscando alumno por tarjeta');
        this.isStudentScanned = false;
      });
  }

  selectStudent(s: Student) {
    if (!s.accounts || s.accounts.length === 0) {
      this.notifications.warning('Sin Cuenta', 'Este alumno no tiene cuenta activada en este kiosco');
      return;
    }
    this.selectedStudent = s;
    this.focusSearch();
  }

  removeStudent() {
    this.selectedStudent = null;
  }

  // --- PROCESO DE PAGO ---

  checkout() {
    if (this.cart.length === 0 || this.isLoading) return;
    this.showPaymentModal = true;
  }

  onPaymentConfirmed(data: { method: 'CASH' | 'CARD' | 'MERCADOPAGO', invoicing?: any }) {
    const { method, invoicing } = data;
    // Validación: pago con tarjeta requiere alumno escaneado
    if (method === 'CARD' && !this.selectedStudent) {
      this.notifications.error('Error', 'Debe escanear la tarjeta RFID del alumno para pagar con saldo');
      this.showPaymentModal = false;
      return;
    }

    if (method === 'CARD' && this.selectedStudent) {
      const saldoDisponible = (this.selectedStudent.accounts?.[0]?.balanceCents || 0) / 100;
      if (saldoDisponible < this.total) {
        this.notifications.error('Saldo Insuficiente', `Tiene $${saldoDisponible}, Total $${this.total}`);
        this.showPaymentModal = false;
        return;
      }
    }

    if (method !== 'MERCADOPAGO') {
      this.showPaymentModal = false;
    }
    this.isLoading = true;

    // 2. Construcción del Payload con UUID de idempotencia
    const idempotencyKey = crypto.randomUUID();
    const payload: any = {
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPriceCents: item.product.priceCents
      })),
      totalCents: Math.round(this.total * 100),
      childId: method === 'CARD' ? this.selectedStudent?.id : null,
      paymentMethod: method,
      idempotencyKey,
      shouldInvoice: invoicing?.shouldInvoice,
      clientDocType: invoicing?.docType,
      clientDocNumber: invoicing?.docNumber
    };

    // Usamos el API service directamente para manejar la respuesta V2 de MP
    this.api.post('/pos/transactions', payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (res.paymentRequired && res.method === 'MERCADOPAGO') {
          this.qrCodeUrl = res.initPoint;
          this.startPaymentPolling(res.id);
          return;
        }

        if (res.invoiceStatus === 'ERROR') {
          this.notifications.warning('Venta Exitosa', `Pero hubo un error al facturar (AFIP): ${res.invoiceError}`);
        } else {
          this.notifications.success('Venta Exitosa', `Ticket #${res.id}`);
        }
        
        this.showPaymentModal = false;
        this.printTicket(res.id);
        this.resetCart();
        this.loadProducts();
      },
      error: async (err) => {
        this.isLoading = false;
        this.showPaymentModal = false;

        // --- OFFLINE OUTBOX ---
        // If the error is a network failure (status 0 or 503), queue for later
        if (err?.status === 0 || err?.status === 503) {
          console.warn('📦 Venta guardada en cola offline con key:', idempotencyKey);
          await this.localDb.addToQueue('SALE', payload);
          this.syncService.pendingItemsCount.update(c => c + 1);
          this.notifications.warning(
            'Modo Offline',
            'Sin conexión. La venta fue guardada y se enviará automáticamente cuando vuelva internet.'
          );
          this.resetCart();
          return;
        }

        console.error('Error en venta:', err);
        const msg = err?.error?.message || 'No se pudo procesar la venta';
        this.notifications.error('Error', msg);
      }
    });
  }

  private pollingInterval: any;
  private startPaymentPolling(txId: number) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      this.api.get(`/pos/transactions/${txId}`).subscribe({
        next: (tx: any) => {
          if (tx.status === 'PAID' || tx.status === 'COMPLETED') {
            clearInterval(this.pollingInterval);
            this.showPaymentModal = false;
            this.qrCodeUrl = undefined;
            this.notifications.success('Pago Confirmado', '¡Venta realizada con éxito!');
            this.printTicket(txId);
            this.resetCart();
            this.loadProducts();
          } else if (tx.status === 'FAILED' || tx.status === 'CANCELED') {
            clearInterval(this.pollingInterval);
            this.showPaymentModal = false;
            this.qrCodeUrl = undefined;
            this.notifications.error('Pago Fallido', 'La transacción fue rechazada.');
          }
        }
      });
    }, 3000);
  }

  printTicket(txId: number) {
    this.api.get(`/pos/transactions/${txId}`).subscribe({
      next: (transactionData) => {
        this.printingService.printTicket(transactionData);
      },
      error: (err) => console.error('Error al obtener datos para ticket', err)
    });
  }

  focusSearch() {
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }

  // Verificar si algún producto quedó con stock bajo después de la venta
  checkLowStockAfterSale(soldItems: CartItem[]) {
    // Esperar un momento para que los productos se recarguen
    setTimeout(() => {
      for (const item of soldItems) {
        // Buscar el producto actualizado en la lista
        const updatedProduct = this.products.find(p => p.id === item.product.id);

        if (updatedProduct) {
          const minStock = updatedProduct.minStock || 5;

          if (updatedProduct.stockQuantity <= minStock) {
            // Notificar bajo stock (Visual)
            if (updatedProduct.stockQuantity === 0) {
              this.notifications.warning('Sin Stock', `${updatedProduct.name} está agotado`);
            } else {
              this.notifications.showLowStockAlert(updatedProduct.name, updatedProduct.stockQuantity);
            }

            // Preguntar si agregar a lista de compras (Si tiene proveedor)
            if (updatedProduct.supplierId) {
              this.askToAddToShoppingList(updatedProduct);
            }
          }
        }
      }
    }, 1000);
  }

  private purchaseOrdersService = inject(PurchaseOrdersService);

  askToAddToShoppingList(product: Product) {
    // Usamos un pequeño delay para no encimar con la alerta de stock
    setTimeout(async () => {
      const ok = await this.confirm.confirm({
        title: 'Reponer producto',
        message: `El stock de "${product.name}" es bajo. ¿Deseas agregarlo a la lista de compras del proveedor?`,
        confirmText: 'Sí, agregar',
        type: 'primary'
      });

      if (ok) {
        // Default cantidad a pedir: 10 (o lo que falte para minStock x 2)
        const qtyToOrder = 10;
        this.purchaseOrdersService.addToDraft(product.supplierId!, product.id, qtyToOrder).subscribe({
          next: () => this.notifications.success('Lista de Compras', `Agregado a lista de ${product.supplierName || 'proveedor'}`),
          error: () => this.notifications.error('Error', 'No se pudo agregar a la lista')
        });
      }
    }, 500);
  }

  // =====================================================
  // ATAJOS DE TECLADO
  // =====================================================

  // F1-F12 Shortcuts logic uses 'this.quickProducts' which is now defined above based on favorites.

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    // No procesar si hay un modal abierto
    if (this.showPaymentModal || this.isSessionClosed) return;

    // No procesar si estamos escribiendo en un input (excepto para ESC y F-keys)
    const isTyping = ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName);

    switch (event.key) {
      // ESC - Limpiar carrito o quitar foco del input
      case 'Escape':
        event.preventDefault();
        if (this.cart.length > 0) {
          this.clearCart();
          this.notifications.info('Carrito', 'Carrito vaciado');
        }
        this.focusSearch();
        break;

      // F12 - Ir a cobrar
      case 'F12':
        event.preventDefault();
        if (this.cart.length > 0) {
          this.checkout();
        }
        break;

      // F1-F10 - Agregar producto rápido
      case 'F1':
      case 'F2':
      case 'F3':
      case 'F4':
      case 'F5':
      case 'F6':
      case 'F7':
      case 'F8':
      case 'F9':
      case 'F10':
        event.preventDefault();
        // Quitar foco del input si lo tiene
        (document.activeElement as HTMLElement)?.blur();
        const index = parseInt(event.key.replace('F', ''), 10) - 1;
        if (this.quickProducts[index]) {
          this.addToCart(this.quickProducts[index], true); // skipFocus = true
        }
        break;

      // + y - para modificar cantidad del último producto en carrito
      case '+':
      case '=':
        if (!isTyping && this.cart.length > 0) {
          event.preventDefault();
          const lastItem = this.cart[this.cart.length - 1];
          this.updateQuantity(lastItem.product.id, 1);
        }
        break;

      case '-':
        if (!isTyping && this.cart.length > 0) {
          event.preventDefault();
          const lastItem = this.cart[this.cart.length - 1];
          this.updateQuantity(lastItem.product.id, -1);
        }
        break;

      // Delete o Backspace - Eliminar último producto del carrito
      case 'Delete':
      case 'Backspace':
        if (!isTyping && this.cart.length > 0) {
          event.preventDefault();
          const lastItem = this.cart[this.cart.length - 1];
          this.removeFromCart(lastItem.product.id);
          this.notifications.info('Eliminado', lastItem.product.name);
        }
        break;
    }
  }
}


