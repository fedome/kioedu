// src/pos/rate-limit/kiosk-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit por kiosco:
 * - Si hay JWT de kiosco ⇒ "kiosk:<kioskId>"
 * - Si hay X-Kiosk-Key   ⇒ "kioskKey:<apiKey>"
 * - Si no, fallback a IP
 *
 * En @nestjs/throttler v6, getTracker debe devolver Promise<string>.
 */
@Injectable()
export class KioskThrottlerGuard extends ThrottlerGuard {
    // ✅ SIN async: devolvemos Promise<string> explícitamente
    protected getTracker(req: Record<string, any>): Promise<string> {
        const user = req.user as { kind?: string; kioskId?: number } | undefined;
        if (user?.kind === 'kiosk' && typeof user.kioskId === 'number') {
            return Promise.resolve(`kiosk:${user.kioskId}`);
        }

        const apiKey = req.headers?.['x-kiosk-key'];
        if (typeof apiKey === 'string' && apiKey.length > 0) {
            return Promise.resolve(`kioskKey:${apiKey}`);
        }

        const ip = (req.ip ?? (Array.isArray(req.ips) ? req.ips[0] : '') ?? 'unknown') as string;
        return Promise.resolve(ip);
    }
}
