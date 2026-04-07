import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Solo agregar header de ngrok en desarrollo
  const baseHeaders: Record<string, string> = {};
  if (!environment.production) {
    baseHeaders['ngrok-skip-browser-warning'] = 'true';
  }

  // Para login/signup NO hace falta token, pero sí el header de ngrok
  if (req.url.includes('/auth/login') || req.url.includes('/auth/signup')) {
    const reqWithNgrok = req.clone({
      setHeaders: baseHeaders,
    });
    return next(reqWithNgrok);
  }

  // Para el resto, agregamos token + header de ngrok
  return from(authService.getToken()).pipe(
    switchMap((token) => {
      const headers: Record<string, string> = { ...baseHeaders };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const authReq = req.clone({
        setHeaders: headers,
      });

      return next(authReq);
    })
  );
};
