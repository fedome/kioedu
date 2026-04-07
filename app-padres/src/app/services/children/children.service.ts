import { Injectable, inject } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {Child, UserProfile} from '../../interfaces/child.interface';
import { Observable, map } from 'rxjs';
import {AccountMovement} from "../../interfaces/account-statement.interface";

@Injectable({ providedIn: 'root' })
export class ChildrenService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Obtiene los hijos del usuario logueado.
   * Asumimos que el backend tiene un endpoint GET /users/me/children
   * o que GET /auth/me devuelve los hijos (depende de tu backend).
   */
  getMyChildren(): Observable<any[]> {
    // IMPORTANTE: El backend devuelve el objeto User completo en /auth/me
    // Nosotros solo queremos la propiedad 'children' de ese objeto.
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/me`).pipe(
      map(user => {
        return user.children || [];
      })
    );
  }

  addChild(data: { firstName: string; lastName: string; inviteCode?: string }) {
    return this.http.post(`${this.apiUrl}/users/me/children`, data);
  }

  /**
   * Busca un colegio por su código de invitación (público).
   */
  lookupSchoolByCode(code: string): Observable<{ id: number; name: string; address?: string }> {
    const params = new HttpParams().set('code', code);
    return this.http.get<{ id: number; name: string; address?: string }>(`${this.apiUrl}/schools/lookup`, { params });
  }

  updateChild(childId: number, dto: any): Observable<Child> {
    // ajustá la URL si tu backend usa otra ruta
    return this.http.patch<Child>(
      `${this.apiUrl}/users/children/${childId}`,
      dto
    );
  }

  getStatement(childId: number, limit = 20) {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<AccountMovement[]>(
      `${this.apiUrl}/accounts/${childId}/statement`,
      { params },
    );
  }

  /**
   * Vincula una tarjeta física (uidHex) a un hijo.
   * Endpoint: POST /users/children/:childId/card
   */
  /** Vincula una tarjeta física (uidHex) a un hijo. */
  linkCard(childId: number, uidHex: string) {
    return this.http.post<Child>(
      `${this.apiUrl}/users/children/${childId}/card`,
      { uidHex }
    );
  }

  /** Bloquea la tarjeta por pérdida */
  blockCard(childId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/children/${childId}/block-card`, {});
  }

  /** Bloquea o desbloquea credito/credencial (Legacy/Admin) */
  toggleCardBlock(childId: number, isBlocked: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/children/${childId}/card/block`, { isBlocked });
  }

  /** Transfiere saldo entre cuentas de hermanos */
  transfer(fromChildId: number, toChildId: number, amountCents: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/children/transfer`, { fromChildId, toChildId, amountCents });
  }

  /** Desactiva / elimina un hijo de la cuenta del padre */
  deactivateChild(childId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/children/${childId}`);
  }

  /** Reactiva un hijo (lo dejamos preparado para más adelante) */
  reactivateChild(childId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/children/${childId}/reactivate`, {});
  }

  // ── Spending Summary ──────────────────────────
  getSpendingSummary(childId: number, days: number = 7): Observable<SpendingSummary> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<SpendingSummary>(
      `${this.apiUrl}/children/${childId}/spending-summary`,
      { params },
    );
  }

  // ── Card Events ───────────────────────────────
  getCardEvents(childId: number): Observable<CardEvent[]> {
    return this.http.get<CardEvent[]>(
      `${this.apiUrl}/children/${childId}/card/events`,
    );
  }

  // ── Category Restrictions ─────────────────────
  getCategoryRestrictions(childId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/children/${childId}/restrictions`,
    );
  }

  addCategoryRestriction(childId: number, categoryId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/children/${childId}/restrictions`,
      { categoryId },
    );
  }

  removeCategoryRestriction(childId: number, categoryId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/children/${childId}/restrictions/${categoryId}`,
    );
  }
}

// Interfaces for new features
export interface SpendingSummary {
  totalCents: number;
  days: number;
  transactionCount: number;
  categories: CategorySpending[];
}

export interface CategorySpending {
  name: string;
  totalCents: number;
  count: number;
}

export interface CardEvent {
  id: number;
  cardId: number;
  event: string;
  reason: string | null;
  userId: number | null;
  createdAt: string;
}
