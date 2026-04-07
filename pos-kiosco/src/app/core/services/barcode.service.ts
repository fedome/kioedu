import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import { NotificationService } from './notification.service';
import { Subject } from 'rxjs';

export interface ScannedProduct {
    id: number;
    name: string;
    priceCents: number;
    stockQuantity: number;
    barcode: string;
}

@Injectable({
    providedIn: 'root'
})
export class BarcodeService {
    private router = inject(Router);
    private api = inject(ApiService);
    private notifications = inject(NotificationService);
    private ngZone = inject(NgZone);

    // Buffer para capturar teclas del escáner
    private buffer = '';
    private lastKeyTime = 0;
    private readonly SCAN_TIMEOUT = 100; // ms máximo entre teclas del escáner

    // Evento cuando se escanea un producto
    productScanned = new Subject<ScannedProduct>();

    // Páginas donde NO se debe interceptar el escáner (porque ya tienen su propia lógica)
    private excludedPaths = ['/pos/sale'];

    constructor() {
        this.initGlobalScanner();
    }

    private initGlobalScanner() {
        // Escuchar teclas a nivel global FUERA de Angular para no disparar change detection en cada tecla
        this.ngZone.runOutsideAngular(() => {
            document.addEventListener('keydown', (event) => {
                this.handleKeyPress(event);
            });
        });
    }

    private handleKeyPress(event: KeyboardEvent) {
        const currentPath = this.router.url;

        // No interceptar si estamos en el POS (ya maneja su propio scanner)
        if (this.excludedPaths.some(path => currentPath.startsWith(path))) {
            return;
        }

        // No interceptar si el usuario está escribiendo en un input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        const now = Date.now();

        // Si pasó mucho tiempo desde la última tecla, reiniciar buffer
        if (now - this.lastKeyTime > this.SCAN_TIMEOUT && this.buffer.length > 0) {
            this.buffer = '';
        }

        this.lastKeyTime = now;

        // Enter termina el código de barras
        if (event.key === 'Enter') {
            if (this.buffer.length >= 3) {
                this.processBarcode(this.buffer);
            }
            this.buffer = '';
        } else if (event.key.length === 1) {
            // Solo agregar caracteres normales
            this.buffer += event.key;
        }
    }

    private processBarcode(barcode: string) {
        console.log('🔍 Código escaneado:', barcode);

        // Volvemos a Angular Zone para hacer la petición y actualizar UI
        this.ngZone.run(() => {
            // Buscar el producto en el backend
            this.api.get<ScannedProduct[]>(`/products?search=${encodeURIComponent(barcode)}`).subscribe({
                next: (products) => {
                    if (products.length > 0) {
                        const product = products.find(p => p.barcode === barcode) || products[0];

                        // Notificar que se encontró el producto
                        this.notifications.success('Producto Escaneado', product.name);

                        // Emitir evento
                        this.productScanned.next(product);

                        // Redirigir al POS con el producto
                        this.router.navigate(['/pos/sale'], {
                            queryParams: { addProduct: product.id }
                        });
                    } else {
                        this.notifications.warning('No Encontrado', `Código: ${barcode}`);
                    }
                },
                error: () => {
                    this.notifications.error('Error', 'No se pudo buscar el producto');
                }
            });
        });
    }
}
