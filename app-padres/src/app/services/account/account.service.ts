// src/app/services/account/account.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import {
  AccountMovement,
  DailyLimitDto,
} from 'src/app/interfaces/account-statement.interface';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getStatement(childId: number, limit = 50): Observable<AccountMovement[]> {
    return this.http.get<AccountMovement[]>(
      `${this.baseUrl}/accounts/${childId}/statement`,
      {
        params: { limit: limit.toString() },
      }
    );
  }


  getDailyLimit(childId: number): Observable<DailyLimitDto> {
    return this.http
      .get<DailyLimitDto>(`${this.baseUrl}/limits/${childId}`)
      .pipe(
        catchError((err) => {
          // Si decidís que 404 = sin límite configurado
          if (err.status === 404) {
            return of({
              childId,
              limitCents: 0,
              updatedAt: new Date(0).toISOString(),
            } as DailyLimitDto);
          }
          return throwError(() => err);
        }),
      );
  }

  updateDailyLimit(childId: number, limitCents: number): Observable<DailyLimitDto> {
    return this.http.put<DailyLimitDto>(
      `${this.baseUrl}/limits/${childId}`,
      { limitCents },
    );
  }

  topupChild(childId: number, amountCents: number, description?: string) {
    return this.http.post(
      `${this.baseUrl}/accounts/${childId}/topup`,
      {
        amountCents,
        description: description ?? null,
      }
    );
  }
}
