import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

/**
 * Roles soportados en KioEdu.
 */
export type AppRole = Role | keyof typeof Role;

/**
 * Clave de metadata usada por el RolesGuard para leer los roles requeridos.
 */
export const ROLES_KEY = 'app:roles';

/**
 * Decorador para declarar roles requeridos en handlers o controladores.
 * Ej.: @Roles(Role.ADMIN) o @Roles(Role.ADMIN, Role.CASHIER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
