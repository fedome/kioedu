import { Injectable, inject, effect, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { LocalDbService, OfflineProduct, OfflineStudent } from './local-db.service';
import { UiService } from './ui.service';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from './confirm.service';

export interface SyncError {
    item: any;
    error: string;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class SyncService {
    private api = inject(ApiService);
    private db = inject(LocalDbService);
    private ui = inject(UiService);
    private confirmService = inject(ConfirmService);

    // Estado UI expuesto
    public isSyncing = signal(false);
    public pendingItemsCount = signal(0);
    public syncErrors = signal<SyncError[]>([]); // Items que fallaron

    constructor() {
        // Escuchar cambios de conexión usando Signals
        effect(() => {
            const online = this.ui.isOnline();
            if (online) {
                // Ejecutamos fuera del ciclo de change detection por seguridad
                setTimeout(() => {
                    console.log('🔄 Conexión detectada. Iniciando sincronización...');
                    this.processQueue();
                    this.syncData();
                }, 1000);
            }
        });
    }

    init() {
        console.log('🚀 SyncService iniciado');
    }

    /**
     * Sincronizar Datos Maestros (Productos, Alumnos)
     */
    /**
     * Sincronizar Datos Maestros (Productos, Alumnos)
     */
    async syncData() {
        if (this.isSyncing()) return;
        this.isSyncing.set(true);

        try {
            // --- PRODUCTOS ---
            console.log('⬇️ Sincronizando Productos...');
            try {
                const lastSync = localStorage.getItem('lastSync_products');
                const params: any = {};
                if (lastSync) params.lastSync = lastSync;

                // Traemos solo los modificados (o todos si no hay lastSync)
                // backend filter handles "updatedAt > lastSync"
                const products = await firstValueFrom(this.api.get<any[]>('/products', params));

                if (products && products.length > 0) {
                    const localProducts: OfflineProduct[] = products.map(p => ({
                        id: p.id,
                        name: p.name,
                        barcode: p.barcode,
                        priceCents: p.priceCents,
                        stockQuantity: p.stockQuantity,
                        isActive: p.isActive
                    }));

                    // Usamos bulkPut para "Upsert" (Insertar o Actualizar)
                    await this.db.products.bulkPut(localProducts);
                    console.log(`📦 Sincronizados ${localProducts.length} productos (Incremental)`);

                    // Guardamos fecha de sync exitosa
                    localStorage.setItem('lastSync_products', new Date().toISOString());
                } else {
                    console.log('📦 Productos actualizados (Sin cambios)');
                }
            } catch (err) {
                console.error('Error syncing products', err);
            }

            // --- ALUMNOS ---
            console.log('⬇️ Sincronizando Alumnos...');
            try {
                const lastSync = localStorage.getItem('lastSync_students');
                const params: any = {};
                if (lastSync) params.lastSync = lastSync;

                const students = await firstValueFrom(this.api.get<any[]>('/pos/students', params));

                if (students && students.length > 0) {
                    const localStudents: OfflineStudent[] = students.map(s => ({
                        id: s.id,
                        firstName: s.firstName,
                        lastName: s.lastName,
                        documentNumber: s.documentNumber,
                        balanceCents: s.accounts?.[0]?.balanceCents ?? 0,
                        dailyLimitCents: s.dailyLimit?.limitCents ?? 0,
                        isActive: s.isActive,
                        cardUid: s.card?.uidHex
                    }));

                    await this.db.bulkPutStudents(localStudents);
                    console.log(`🎓 Sincronizados ${localStudents.length} alumnos (Incremental)`);

                    localStorage.setItem('lastSync_students', new Date().toISOString());
                } else {
                    console.log('🎓 Alumnos actualizados (Sin cambios)');
                }
            } catch (e) {
                console.warn('⚠️ No se pudo sincronizar alumnos', e);
            }

        } catch (err) {
            console.error('❌ Error general sincronizando datos:', err);
        } finally {
            this.isSyncing.set(false);
        }
    }

    /**
     * Procesar Cola de Transacciones Offline
     */
    async processQueue() {
        // Actualizar contador inicial
        const initialQueue = await this.db.getQueue();
        this.pendingItemsCount.set(initialQueue.length);

        if (initialQueue.length === 0) {
            this.syncErrors.set([]); // Limpiar errores si no hay cola
            return;
        }

        this.isSyncing.set(true);
        const currentErrors: SyncError[] = [];
        console.log(`📤 Procesando ${initialQueue.length} transacciones offline...`);

        try {
            // Volver a leer la cola por si cambió
            const queue = await this.db.getQueue();

            for (const item of queue) {
                try {
                    if (item.type === 'SALE') {
                        // Preparamos payload
                        // Importante: Marcar isOffline = true para auditoría y bypass de validación estricta
                        const payload = {
                            ...item.payload, // Use item.payload as the base
                            isOffline: true
                        };
                        // El endpoint real es /pos/transactions (v2)
                        await firstValueFrom(this.api.post('/pos/transactions', payload)); // Use the original endpoint
                    }
                    else if (item.type === 'TOPUP') {
                        await firstValueFrom(this.api.post('/pos/balance/charge', item.payload));
                    }

                    // Si éxito, borrar de cola
                    if (item.id) await this.db.removeFromQueue(item.id);

                    // Actualizar contador
                    this.pendingItemsCount.update(c => Math.max(0, c - 1));
                    console.log(`✅ Item cola ${item.id} sincronizado.`);

                } catch (err: any) {
                    console.error(`❌ Error procesando item cola ${item.id}:`, err);
                    currentErrors.push({
                        item,
                        error: err?.error?.message || err?.message || 'Error desconocido',
                        timestamp: new Date()
                    });
                }
            }
            this.syncErrors.set(currentErrors);
        } finally {
            // Al final del lote, revisamos si quedó algo (por error)
            const remaining = await this.db.getQueue();
            this.pendingItemsCount.set(remaining.length);
            this.isSyncing.set(false);
        }
    }

    /**
     * Reintento manual de errores
     */
    async retryErrors() {
        if (this.isSyncing()) return;
        console.log('🔄 Reintentando transacciones fallidas...');
        await this.processQueue();
    }

    /**
     * Descartar error (Eliminar transacción de la cola)
     */
    async discardError(errorItem: SyncError) {
        if (!errorItem.item?.id) return;

        const confirmed = await this.confirmService.confirm({
            title: 'Descartar Transacción',
            message: '¿Estás seguro de descartar esta transacción? Se perderá permanentemente.',
            confirmText: 'Sí, descartar',
            type: 'danger'
        });

        if (confirmed) {
            await this.db.removeFromQueue(errorItem.item.id);

            // Actualizar lista de errores y contador
            this.syncErrors.update(list => list.filter(e => e.item.id !== errorItem.item.id));
            this.pendingItemsCount.update(c => Math.max(0, c - 1));

            console.log(`🗑️ Transacción ${errorItem.item.id} descartada por el usuario.`);
        }
    }
}
