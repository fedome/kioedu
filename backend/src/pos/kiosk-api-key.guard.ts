import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KioskApiKeyGuard implements CanActivate {
    private readonly logger = new Logger(KioskApiKeyGuard.name);
    constructor(private prisma: PrismaService) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest();
        const apiKey = req.headers['x-kiosk-key'] as string | undefined;

        if (!apiKey) {
            throw new UnauthorizedException('Missing X-Kiosk-Key');
        }

        const kiosk = await this.prisma.kiosk.findUnique({ where: { apiKey } });
        if (!kiosk) {
            this.logger.warn('Invalid API Key attempt');
            throw new UnauthorizedException('Invalid kiosk key');
        }

        if (!kiosk.subscriptionActive) {
            this.logger.warn(`Kiosk #${kiosk.id} subscription inactive`);
            throw new ForbiddenException('La suscripción de este Kiosco está inactiva o suspendida.');
        }

        req.kiosk = kiosk;
        return true;
    }
}