import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Enviar todas las excepciones no capturadas o 500s a Sentry
        const status = error.status || error.statusCode;
        
        // Generalmente ignoramos los 4xx (errores del cliente), excepto si son críticos
        if (!status || status >= 500) {
          Sentry.withScope((scope) => {
            const req = context.switchToHttp().getRequest();
            scope.setTag('url', req.url);
            scope.setTag('method', req.method);
            
            // Si el request tiene un header de tenant (Kiosk Key)
            const kioskKey = req.headers['x-kiosk-key'];
            if (kioskKey) {
              scope.setTag('kioskKey', 'present');
            }
            
            // Agregar data del usuario si está logueado
            if (req.user) {
              scope.setUser({ id: req.user.sub || req.user.id });
            }

            // Excluir errores específicos si se desea (Ej: NotFoundException)
            Sentry.captureException(error);
          });
        }
        
        throw error;
      }),
    );
  }
}
