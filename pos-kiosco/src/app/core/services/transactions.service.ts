import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable, firstValueFrom } from 'rxjs';
import { LocalDbService } from './local-db.service';
import { UiService } from './ui.service';

export interface TransactionQuery {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private api = inject(ApiService);
  private db = inject(LocalDbService);
  private ui = inject(UiService);

  // Crear Transacción (Soporte Offline)
  async createTransaction(payload: any): Promise<any> {
    let res: any = null;

    // 1. Si estamos ONLINE -> Directo al API
    if (this.ui.isOnline()) {
      try {
        res = await firstValueFrom(this.api.post('/pos/transactions', payload));
      } catch (error) {
        console.error('Error online, intentando offline fallback?', error);
        // Could fallback, but for now let's throw or handle.
        // If we want robust offline, we should treat error as offline condition?
        // For simple logic, assume online success or throw. 
        // But to keep flow, let's just let it throw if API fails.
        throw error;
      }
    } else {
      // Offline Mock Response
      res = {
        id: -1,
        offline: true,
        createdAt: new Date().toISOString()
      };
    }

    // 2. Offline Logic Logic & Local History Logging (Unified)
    // Even if online, we update local DB and History so the UI is snappy and consistent.

    // Validar Saldo Local si es cuenta (Riesgo de doble gasto aceptado)
    if (payload.childId) {
      const student = await this.db.students.get(payload.childId);
      if (student) {
        if (payload.paymentMethod === 'ACCOUNT') {
          // Si paga con Cuenta Corriente, disminuimos el saldo (más deuda)
          const newBalance = student.balanceCents - payload.totalCents;

          // Actualización optimista del saldo local
          await this.db.students.update(payload.childId, { balanceCents: newBalance });

          // Registrar transacción local
          await this.db.studentTransactions.add({
            studentId: payload.childId,
            type: 'PURCHASE',
            amountCents: payload.totalCents,
            date: new Date(),
            description: 'Compra en Kiosco (Offline)',
            relatedSaleId: -1 // ID temporal
          });
        }
      }
    }

    // 3. Log Stock Movement (Local Audit Trail for History View)
    // We log this locally so the user can see the history in the new "Stock History" modal
    // regardless of whether the backend implements a history endpoint or not yet.
    for (const item of payload.items) {
      // a) Update Local Product Stock (Optimistic)
      const prod = await this.db.products.get(item.productId);
      if (prod) {
        await this.db.products.update(item.productId, { stockQuantity: prod.stockQuantity - item.quantity });
      }

      // b) Add to History
      await this.db.stockTransactions.add({
        productId: item.productId,
        type: 'SALE',
        quantity: -item.quantity, // Negative for sale
        date: new Date(),
        reason: 'Venta #' + (res?.id || 'OFFLINE'),
        userId: 1 // TODO: Get actual user ID
      });
    }

    // 4. If Offline, Add to Queue
    if (!this.ui.isOnline()) {
      await this.db.addToQueue('SALE', payload);
    }

    // 5. Save to Local History (Always, for Chart/Reports)
    await this.db.transactions.add({
      totalCents: payload.totalCents,
      date: new Date(),
      itemsCount: payload.items.length,
      paymentMethod: payload.paymentMethod,
      type: 'SALE'
    });

    return res || {
      id: -1,
      offline: true,
      createdAt: new Date().toISOString()
    };
  }

  // Obtener los últimos tickets (últimos 30 días)
  getLatestTransactions(pageSize: number = 100): Observable<any> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 días atrás
    startDate.setHours(0, 0, 0, 0);

    return new Observable(observer => {
      // Try API
      this.api.get('/reports/transactions', {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        pageSize,
        page: 1
      }).subscribe({
        next: (data) => {
          observer.next(data);
          observer.complete();
        },
        error: (err) => {
          console.warn('API Transactions failed, using local fallback', err);
          // Fallback to local
          this.db.transactions
            .where('date').between(startDate, endDate)
            .reverse()
            .limit(pageSize)
            .toArray()
            .then(localData => {
              observer.next(localData);
              observer.complete();
            })
            .catch(localErr => observer.error(localErr));
        }
      });
    });
  }

  // Obtener transacciones de un día específico
  getDailyTransactions(query: TransactionQuery): Observable<any> {
    return this.api.get('/reports/transactions', query);
  }

  getById(id: number): Observable<any> {
    return this.api.get(`/pos/transactions/${id}`);
  }

  voidTransaction(id: number, reason: string): Observable<any> {
    return this.api.post(`/pos/transactions/${id}/void`, { reason });
  }
}

