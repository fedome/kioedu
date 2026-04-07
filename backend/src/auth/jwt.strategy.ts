import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
            ignoreExpiration: false,
        });

        // Debug inocuo: confirma que leyó el secreto sin exponerlo
        if (!process.env.JWT_SECRET) {
            // eslint-disable-next-line no-console
            console.warn('⚠ JWT_SECRET no está definido. Ver .env / ConfigModule.');
        }
    }

    async validate(payload: { sub: number; email: string; roles: string[] }) {
        // payload viene del sign({ sub, email, roles })
        if (!payload?.sub || !payload?.email) {
            throw new UnauthorizedException('Token inválido');
        }
        return payload; // request.user = payload
    }
}