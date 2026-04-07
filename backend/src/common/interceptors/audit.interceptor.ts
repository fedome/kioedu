// src/common/interceptors/audit.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interceptor de auditoría:
 * - Asigna un requestId
 * - Mide duración
 * - Persiste log (opcional) en AuditLog
 */
@Injectable()
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        const start = Date.now();
        const requestId = randomUUID();
        req.requestId = requestId;

        const method = req.method;
        const path = req.originalUrl || req.url;
        const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '';
        const userAgent = (req.headers['user-agent'] as string) ?? '';

        // Identidad (si es kiosco)
        const kioskFromJwt = req.user?.kind === 'kiosk' ? req.user?.kioskId : undefined;
        const kioskFromHeader = req.kiosk?.id;
        const kioskId = kioskFromJwt ?? kioskFromHeader;
        const userId = req.user?.sub;

        return next.handle().pipe(
            tap(async () => {
                const durationMs = Date.now() - start;
                const status = res.statusCode;

                // Log estructurado usando Logger de NestJS
                this.logger.log(`${method} ${path} ${status} ${durationMs}ms - ReqId:${requestId} Kiosk:${kioskId ?? '-'} User:${userId ?? '-'}`);

                // Persistencia opcional (no bloquear la respuesta)
                try {
                    await this.prisma.auditLog.create({
                        data: { requestId, method, path, status, durationMs, ip, userAgent, kioskId, userId },
                    });
                } catch {
                    // si falla el log DB, no rompemos la request
                }
            }),
        );
    }
}
