import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { firstValueFrom } from 'rxjs';

export interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    createdAt: string;
    isActive?: boolean;
}

export interface Role {
    id: number;
    name: string;
    description?: string;
    permissions: any[];
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private api = inject(ApiService);

    async findAll(schoolId?: number, role?: string): Promise<User[]> {
        const params: any = {};
        if (role) params.role = role;
        if (schoolId) params.schoolId = schoolId;
        return firstValueFrom(this.api.get<User[]>('/users', params));
    }

    async findById(id: number): Promise<User> {
        return firstValueFrom(this.api.get<User>(`/users/${id}`));
    }

    async create(user: Partial<User> & { password?: string }): Promise<User> {
        return firstValueFrom(this.api.post<User>('/users', user));
    }

    async update(id: number, user: Partial<User>): Promise<User> {
        return firstValueFrom(this.api.put<User>(`/users/${id}`, user));
    }

    async resetPassword(id: number, dto: any): Promise<User> {
        return firstValueFrom(this.api.put<User>(`/users/${id}/password`, dto));
    }

    async delete(id: number): Promise<User> {
        return firstValueFrom(this.api.delete<User>(`/users/${id}`));
    }

    async reactivate(id: number): Promise<User> {
        return firstValueFrom(this.api.post<User>(`/users/${id}/reactivate`, {}));
    }

    // Role management
    async findAllRoles(schoolId?: number, onlyPos: boolean = false): Promise<Role[]> {
        const params: any = {};
        if (schoolId) params.schoolId = schoolId;
        if (onlyPos) params.onlyPos = onlyPos;
        return firstValueFrom(this.api.get<Role[]>('/roles', params));
    }

    async createRole(role: any): Promise<Role> {
        return firstValueFrom(this.api.post<Role>('/roles', role));
    }

    async updateRole(id: number, role: any): Promise<Role> {
        return firstValueFrom(this.api.put<Role>(`/roles/${id}`, role));
    }

    async deleteRole(id: number): Promise<void> {
        return firstValueFrom(this.api.delete<void>(`/roles/${id}`));
    }

    async findAllPermissions(): Promise<any[]> {
        return firstValueFrom(this.api.get<any[]>('/roles/permissions/all'));
    }
}
