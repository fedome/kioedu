import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class DebitByCardDto {
    @IsString() @MaxLength(32)
    uidHex: string; // UID leída por el lector

    @IsInt() @IsPositive() @Min(1)
    amountCents: number; // montos en centavos

    @IsString() @MaxLength(120)
    idempotencyKey: string; // para no duplicar si reintenta

    @IsOptional() @IsString() @MaxLength(80)
    reference?: string; // ej: "TICKET-123" o "KIOSK-PRINT-XYZ"
}
