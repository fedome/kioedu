import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Category {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CategoriesService {
    private api = inject(ApiService);

    getAll(): Observable<Category[]> {
        return this.api.get<Category[]>('/categories');
    }

    create(name: string, description?: string): Observable<Category> {
        return this.api.post<Category>('/categories', { name, description });
    }

    update(id: number, data: Partial<Category>): Observable<Category> {
        return this.api.patch<Category>(`/categories/${id}`, data);
    }

    delete(id: number): Observable<any> {
        return this.api.delete(`/categories/${id}`);
    }
}
