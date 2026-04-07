import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Supplier } from './suppliers.service';

export interface PurchaseOrderItem {
    id: number;
    productId: number;
    quantity: number;
    unitCostCents: number;
    product?: {
        name: string;
        barcode: string;
    };
}

export interface PurchaseOrder {
    id: number;
    supplierId: number;
    status: 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'CANCELED';
    totalCostCents: number;
    createdAt: string;
    supplier?: Supplier;
    items: PurchaseOrderItem[];
}

@Injectable({
    providedIn: 'root'
})
export class PurchaseOrdersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/purchase-orders`;

    getDrafts(): Observable<PurchaseOrder[]> {
        return this.http.get<PurchaseOrder[]>(`${this.apiUrl}/drafts/all`);
    }

    addToDraft(supplierId: number, productId: number, quantity: number): Observable<PurchaseOrder> {
        return this.http.post<PurchaseOrder>(`${this.apiUrl}/drafts/add-item`, { supplierId, productId, quantity });
    }

    submitOrder(id: number): Observable<PurchaseOrder> {
        return this.http.post<PurchaseOrder>(`${this.apiUrl}/${id}/submit`, {});
    }

    receiveOrder(id: number, items: any[]): Observable<PurchaseOrder> {
        return this.http.post<PurchaseOrder>(`${this.apiUrl}/${id}/receive`, { items });
    }

    getAll(): Observable<PurchaseOrder[]> {
        return this.http.get<PurchaseOrder[]>(this.apiUrl);
    }
}
