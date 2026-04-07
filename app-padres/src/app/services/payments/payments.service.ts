import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl; // ej: http://localhost:3000/api/v1

  /**
   * Recarga saldo de un hijo.
   * POST /payments/topup
   * Body: { childId, amountCents, paymentMethod }
   */
  topupChild(childId: number, amountCents: number, paymentMethod: string = 'mp'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payments/topup`, {
      childId,
      amountCents,
      paymentMethod,
    });
  }

  createMPPreference(childId: number, amountCents: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mercadopago/preference`, {
      childId,
      amountCents,
    });
  }

  cancelTopup(transactionId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payments/topup/${transactionId}/cancel`, {});
  }
}
