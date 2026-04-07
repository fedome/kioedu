import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// Interfaces locales (simplificadas respecto al backend)
export interface OfflineProduct {
    id: number;
    name: string;
    barcode: string;
    priceCents: number;
    stockQuantity: number;
    minStockLevel?: number; // Added for alerts
    category?: string;
    isActive: boolean;
    supplierId?: number;
    supplierName?: string;
    supplier?: { id: number; name: string };
    // Otros campos opcionales si son necesarios para offline (ej. categoryId)
}

export interface OfflineStudent {
    id: number;
    firstName: string;
    lastName: string;
    documentNumber: string | null;
    balanceCents: number;
    dailyLimitCents: number;
    isActive: boolean;
    cardUid?: string; // Para búsqueda por NFC
}

export interface OfflineQueueItem {
    id?: number; // Autoinc
    type: 'SALE' | 'TOPUP';
    payload: any; // El DTO exacto que se enviaría al backend
    createdAt: number;
    retryCount: number;
    errorLog?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LocalDbService extends Dexie {
    products!: Table<OfflineProduct, number>;
    students!: Table<OfflineStudent, number>;
    offlineQueue!: Table<OfflineQueueItem, number>;
    studentTransactions!: Table<StudentTransaction, number>;
    stockTransactions!: Table<StockTransaction, number>;

    constructor() {
        super('PosKioscoDB');

        // Definición del Esquema (V2 - Agregado transactions)
        this.version(2).stores({
            products: 'id, name, barcode', // Indices principales
            students: 'id, [firstName+lastName], documentNumber, cardUid', // Indices de búsqueda
            offlineQueue: '++id, type, createdAt', // Cola simple
            studentTransactions: '++id, studentId, type, date', // Historial local
            stockTransactions: '++id, productId, type, date', // Historial de stock
            transactions: '++id, date, totalCents' // Historial general de ventas
        });
    }

    transactions!: Table<LocalTransaction, number>;

    // --- Helpers para Productos ---
    async bulkPutProducts(products: OfflineProduct[]) {
        return this.products.bulkPut(products);
    }


    async findProductByBarcode(barcode: string) {
        return this.products.where('barcode').equals(barcode).first();
    }

    async searchProducts(query: string) {
        const q = query.toLowerCase();
        return this.products
            .filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
            .limit(10)
            .toArray();
    }

    // --- Helpers para Alumnos ---
    async bulkPutStudents(students: OfflineStudent[]) {
        return this.students.bulkPut(students);
    }

    async findStudentByCard(uid: string) {
        return this.students.where('cardUid').equals(uid).first();
    }

    async searchStudents(query: string) {
        const q = query.toLowerCase();
        return this.students
            .filter(s =>
                (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) ||
                (s.documentNumber && s.documentNumber.includes(q)) || false
            )
            .limit(10)
            .toArray();
    }

    // --- Helpers para Cola ---
    async addToQueue(type: 'SALE' | 'TOPUP', payload: any) {
        return this.offlineQueue.add({
            type,
            payload,
            createdAt: Date.now(),
            retryCount: 0
        });
    }

    async getQueue() {
        return this.offlineQueue.orderBy('createdAt').toArray();
    }

    async removeFromQueue(id: number) {
        return this.offlineQueue.delete(id);
    }
}

export interface StudentTransaction {
    id?: number;
    studentId: number;
    type: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT';
    amountCents: number;
    date: Date;
    description: string;
    relatedSaleId?: number;
}

export interface StockTransaction {
    id?: number;
    productId: number;
    type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';
    quantity: number;
    date: Date;
    reason?: string;
    userId?: number;
}

export interface LocalTransaction {
    id?: number;
    totalCents: number;
    date: Date;
    itemsCount: number;
    paymentMethod: string;
    type: 'SALE';
}
