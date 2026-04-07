// src/auth/constants.ts
export type JwtExpires = `${number}${'ms'|'s'|'m'|'h'|'d'|'w'|'y'}`;
export const JWT_EXPIRES_IN: JwtExpires = (process.env.JWT_EXPIRES_IN ?? '30m') as JwtExpires;
