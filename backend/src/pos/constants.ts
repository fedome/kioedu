// formatos válidos p/ jsonwebtoken:  "30m", "1h", "7d", etc.
export type JwtExpires = `${number}${'ms'|'s'|'m'|'h'|'d'|'w'|'y'}`;

export const JWT_EXPIRES_IN: JwtExpires = (process.env.JWT_EXPIRES_IN ?? '15m') as JwtExpires;
export const KIOSK_JWT_EXPIRES_IN: JwtExpires = (process.env.KIOSK_JWT_EXPIRES_IN ?? '30m') as JwtExpires;

export interface KioskJwtPayload {
    kind: 'kiosk';
    kioskId: number;
    schoolId: number;
}