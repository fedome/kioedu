/**
 * Reemplazo para el enum Role de Prisma que fue eliminado
 * para soportar RBAC dinámico en la base de datos.
 */
export enum Role {
    PARENT = 'PARENT',
    CASHIER = 'CASHIER',
    ADMIN = 'ADMIN',
    ENCARGADO = 'ENCARGADO',
}
