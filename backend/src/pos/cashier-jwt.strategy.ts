import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/roles.enum';

// Asegúrate de que esta interfaz coincida con tu payload
interface CashierJwtPayload {
    kind: 'cashier';
    kioskId: number;
    schoolId: number;
    userId: number;
    jti?: string;
    roles: string[]; // <-- El campo clave (ahora array)
    email: string;
    sub: number;
}

@Injectable()
export class CashierJwtStrategy extends PassportStrategy(Strategy, 'cashier-jwt') {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
            ignoreExpiration: false,
        });
    }

    async validate(payload: CashierJwtPayload) {
        // 1. Validación básica del token
        if (payload?.kind !== 'cashier' || !payload?.userId || !payload?.kioskId || !payload?.jti) {
            throw new UnauthorizedException('Invalid cashier token');
        }

        // --- INICIO DE LA MODIFICACIÓN (Arregla el bug de ADMIN vs CASHIER) ---
        // Confiamos en los roles que vienen en el payload
        const userRoles = payload.roles || [];
        const isAuthorizedRole = userRoles.includes(Role.CASHIER) ||
            userRoles.includes(Role.ADMIN) ||
            userRoles.includes(Role.ENCARGADO);
        if (!isAuthorizedRole) {
            throw new UnauthorizedException('User role is not authorized for POS');
        }
        // --- FIN DE LA MODIFICACIÓN (ya no buscamos al usuario en la DB para esto) ---

        // 3. Validación de Sesión (tu lógica original, está perfecta)
        const session = await this.prisma.kioskSession.findUnique({ where: { jti: payload.jti } });
        if (!session || session.revokedAt) throw new UnauthorizedException('Cashier session revoked');
        if (session.expiresAt <= new Date()) throw new UnauthorizedException('Cashier session expired');
        if (session.kioskId !== payload.kioskId || session.cashierUserId !== payload.userId) {
            throw new UnauthorizedException('Session mismatch');
        }

        // 4. Devolver el payload COMPLETO para que RolesGuard lo lea
        return payload;
    }
}