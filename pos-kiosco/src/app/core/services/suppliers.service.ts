import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Supplier {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    cuit?: string;
    visitDays?: string;
    contactInfo?: string;
    _count?: {
        purchaseOrders: number;
    };
    createdAt: string;
}

export interface CreateSupplierDto {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    cuit?: string;
    visitDays?: string;
    contactInfo?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SuppliersService {
    private api = inject(ApiService);
    private readonly endpoint = '/suppliers';

    getAll(query?: string): Observable<Supplier[]> {
        const params: any = {};
        if (query) params.q = query;
        return this.api.get<Supplier[]>(this.endpoint, params);
    }

    getOne(id: number): Observable<Supplier> {
        return this.api.get<Supplier>(`${this.endpoint}/${id}`);
    }

    create(dto: CreateSupplierDto): Observable<Supplier> {
        return this.api.post<Supplier>(this.endpoint, dto);
    }

    update(id: number, dto: Partial<CreateSupplierDto>): Observable<Supplier> {
        return this.api.patch<Supplier>(`${this.endpoint}/${id}`, dto);
    }

    delete(id: number): Observable<void> {
        return this.api.delete(`${this.endpoint}/${id}`);
    }
}
