import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { LocalDbService, OfflineProduct, OfflineStudent } from './local-db.service';
import { UiService } from './ui.service';
import { Observable, firstValueFrom } from 'rxjs'; // firstValueFrom es clave para promises
// ... (resto depende de la implementación)

// Para que sea compatible con lo que SaleComponent espera
@Injectable({
    providedIn: 'root'
})
export class ProductsService {
    private api = inject(ApiService);
    private db = inject(LocalDbService);
    private ui = inject(UiService);

    async getAllProducts(): Promise<OfflineProduct[]> {
        if (this.ui.isOnline()) {
            const prods = await firstValueFrom(this.api.get<OfflineProduct[]>('/products'));
            return prods;
        } else {
            return this.db.products.toArray();
        }
    }

    // Actualizar Stock (Soporte Offline/Sincrónico)
    async updateStock(productId: number, quantityDelta: number, reason: string, costCents?: number, expirationDate?: string): Promise<any> {
        // 1. Registro en Historial Local (Audit Trail) regardless of online/offline to have a local copy/cache
        // or strictly for offline if online handles it.
        // Let's do optimistic local update.

        await this.db.stockTransactions.add({
            productId,
            type: quantityDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            quantity: quantityDelta,
            date: new Date(),
            reason: reason || (quantityDelta > 0 ? 'Carga Manual' : 'Ajuste Manual')
        });

        // 2. Actualizar Producto Local
        const product = await this.db.products.get(productId);
        if (product) {
            await this.db.products.update(productId, { stockQuantity: product.stockQuantity + quantityDelta });
        }

        // 3. Sync con Backend
        if (this.ui.isOnline()) {
            const payload = {
                quantity: quantityDelta,
                costCents: costCents ? Math.round(costCents * 100) : undefined,
                expirationDate,
                notes: reason
            };
            return firstValueFrom(this.api.post(`/products/${productId}/stock`, payload));
        } else {
            return { success: true, offline: true };
        }
    }

    async reconcile(productId: number, physicalStock: number, reason: string): Promise<any> {
        // Optimistic local update
        await this.db.products.update(productId, { stockQuantity: physicalStock });

        await this.db.stockTransactions.add({
            productId,
            type: 'ADJUSTMENT',
            quantity: 0, // In reconciliation we don't necessarily know the delta locally without calculating it
            date: new Date(),
            reason: reason || 'Reconciliación de Inventario'
        });

        if (this.ui.isOnline()) {
            return firstValueFrom(this.api.post(`/products/${productId}/reconcile`, { physicalStock, reason }));
        }
        return { success: true, offline: true };
    }

    async getStockHistory(productId: number): Promise<any[]> {
        // Por ahora devolvemos solo lo local, idealmente se mezcla con API
        return this.db.stockTransactions
            .where('productId').equals(productId)
            .reverse()
            .sortBy('date');
    }
}
