import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { DailyLimitSummary } from 'src/app/interfaces/child.interface';

@Injectable({
  providedIn: 'root',
})
export class LimitsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl; // ej: http://localhost:3000/api/v1

  /**
   * Define o actualiza el límite diario de un hijo.
   * PUT /limits/:childId
   * Body: { limitCents: number | null }
   */
  setDailyLimit(childId: number, limitCents: number | null): Observable<DailyLimitSummary> {
    return this.http.put<DailyLimitSummary>(
      `${this.baseUrl}/limits/${childId}`,
      { limitCents }
    );
  }
}
