import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KioskJwtStrategy extends PassportStrategy(Strategy, 'kiosk-jwt') {
    private readonly logger = new Logger(KioskJwtStrategy.name);

    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
            ignoreExpiration: false,
        });
    }

    async validate(payload: KioskJwtPayload) {
        if (payload?.kind !== 'kiosk' || !payload?.kioskId || !payload?.jti) {
            throw new UnauthorizedException('Invalid kiosk token');
        }

        const session = await this.prisma.kioskSession.findUnique({ where: { jti: payload.jti } });

        if (!session) {
            throw new UnauthorizedException('Kiosk session not found');
        }
        if (session.revokedAt) {
            throw new UnauthorizedException('Kiosk session revoked');
        }
        if (session.expiresAt <= new Date()) {
            throw new UnauthorizedException('Kiosk session expired');
        }

        return payload;
    }

}

interface KioskJwtPayload {
    kind: 'kiosk';
    kioskId: number;
    schoolId: number;
    jti?: string;
}
