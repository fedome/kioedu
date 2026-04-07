import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

/**
 * RolesGuard:
 * - Lee la metadata puesta por @Roles(...)
 * - Espera que el JwtAuthGuard haya llenado request.user con { role: string }
 * - Permite el acceso si el rol del usuario está dentro de los requeridos
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(ctx: ExecutionContext): boolean {
        // 1) roles requeridos (ahora son de tipo 'Role[]')
        const requiredRoles =
            this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
                ctx.getHandler(),
                ctx.getClass(),
            ]);

        if (!requiredRoles || requiredRoles.length === 0) return true;

        const req = ctx.switchToHttp().getRequest();
        const user = req.user as any; // { roles: string[] }
        if (!user) throw new ForbiddenException('Missing user');

        const userRoles = user.roles as string[];
        if (!userRoles || userRoles.length === 0) throw new ForbiddenException('Missing user roles');

        // 3) Comparamos: si el usuario tiene al menos UNO de los roles requeridos
        const hasRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            throw new ForbiddenException('Insufficient role');
        }
        return true;
    }
}
