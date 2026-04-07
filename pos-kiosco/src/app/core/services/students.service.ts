import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { LocalDbService, OfflineStudent } from './local-db.service';
import { UiService } from './ui.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class StudentsService {
    private api = inject(ApiService);
    private db = inject(LocalDbService);
    private ui = inject(UiService);

    async search(query: string): Promise<any[]> {
        const q = query.trim();

        // Si no hay query, devolvemos los locales (cache) para mostrar algo rápido
        if (!q) {
            return this.db.searchStudents('');
        }

        if (this.ui.isOnline()) {
            try {
                const results = await firstValueFrom(this.api.get<any[]>(`/pos/students/search?q=${q}`));
                // Cache results locally for robust fallback
                if (results && results.length > 0) {
                    this.db.bulkPutStudents(results).catch(err => console.warn('Error caching students', err));
                }
                return results;
            } catch (e) {
                console.warn('API Search failed, using local fallback', e);
                return this.db.searchStudents(q);
            }
        } else {
            return this.db.searchStudents(q);
        }
    }

    async getStudent(id: number): Promise<any> {
        if (this.ui.isOnline()) {
            try {
                return await firstValueFrom(this.api.get(`/pos/students/${id}`));
            } catch (error) {
                console.warn('API getStudent failed, using local fallback', error);
                // Fallback a local si falla el API (o si el backend no tiene el endpoint aún)
                return this.db.students.get(id);
            }
        } else {
            return this.db.students.get(id);
        }
    }

    async getStudentTransactions(id: number): Promise<any[]> {
        // Siempre intentamos mezclar o priorizar API, pero con fallback
        if (this.ui.isOnline()) {
            try {
                return await firstValueFrom(this.api.get<any[]>(`/pos/students/${id}/transactions`));
            } catch (error) {
                console.warn('API getStudentTransactions failed, using local fallback', error);
                return this.getLocalTransactions(id);
            }
        } else {
            return this.getLocalTransactions(id);
        }
    }

    private getLocalTransactions(id: number) {
        return this.db.studentTransactions
            .where('studentId').equals(id)
            .reverse()
            .sortBy('date');
    }

    async registerPayment(id: number, amountCents: number, method: 'CASH' | 'TRANSFER'): Promise<any> {
        const payload = { amountCents, method };
        let result: any = null;

        // 1. Try API if online
        if (this.ui.isOnline()) {
            try {
                result = await firstValueFrom(this.api.post(`/pos/students/${id}/payment`, payload));
            } catch (error) {
                console.error('API Payment failed', error);
                // If API fails, should we continue to offline? 
                // For this critical fix, let's assume we want to fallback to offline if API fails 
                // OR just proceed to local update if we want "Optimistic UI" even with API error?
                // Let's stick safe: IF API fails, we throw, UNLESS we treat it as offline.
                // But the user reported 404 on GET, POST might work or might not.
                // Safest approach for history visibility: Always log locally.

                // If API throws, we might want to stop? 
                // Let's let it throw for now to warn user, BUT we need that history.
                // Actually, if POST fails, we probably shouldn't log it locally as "confirmed".
                throw error;
            }
        } else {
            result = { success: true, offline: true };
        }

        // 2. Always update local DB (Offline or Online-Optimistic/Cache)
        // This ensures that even if the backend 'getTransactions' 404s, we have the local record.
        const student = await this.db.students.get(id);
        if (student) {
            // Update balance
            await this.db.students.update(id, { balanceCents: student.balanceCents + amountCents });

            // Add to history
            await this.db.studentTransactions.add({
                studentId: id,
                type: 'PAYMENT',
                amountCents: amountCents,
                date: new Date(),
                description: `Pago en ${method === 'CASH' ? 'Efectivo' : 'Transferencia'}`
            });
        }

        return result;
    }
}
