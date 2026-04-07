import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // NO inyectamos CashierAuthService para evitar dependencia circular.
  // Leemos token directamente del storage (misma key que en el servicio)
  const token = localStorage.getItem('cashier_token') || sessionStorage.getItem('cashier_token');

  // Si ya viene Authorization, no lo tocamos
  if (req.headers.has('Authorization')) return next(req);

  // No agregar token a endpoints de bootstrap/login
  if (req.url.includes('/pos/session/login') || req.url.includes('/pos/cashier/login')) {
    return next(req);
  }

  if (!token) return next(req);

  // Verificar expiración (simple check)
  if (isTokenExpired(token)) {
    localStorage.removeItem('cashier_token');
    localStorage.removeItem('cashier_user');
    sessionStorage.removeItem('cashier_token');
    sessionStorage.removeItem('cashier_user');
    window.location.href = '/login';
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token vencido o inválido: Logout forzado (Limpiar ambos)
        localStorage.removeItem('cashier_token');
        localStorage.removeItem('cashier_user');
        sessionStorage.removeItem('cashier_token');
        sessionStorage.removeItem('cashier_user');
        window.location.href = '/login';
      }
      return throwError(() => error);
    })
  );
};

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Convertir Base64Url a Base64 estándar
    let payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    // Añadir padding si falta
    while (payloadBase64.length % 4 !== 0) {
      payloadBase64 += '=';
    }

    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    if (!payload.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    console.error('Token parsing error:', e);
    return true;
  }
}
