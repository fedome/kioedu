import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreditByCardDto {
    @ApiProperty({ description: 'UID de la tarjeta del alumno', example: '04A1B2C3D4E5' })
    @IsString()
    @IsNotEmpty()
    uidHex: string;

    @ApiProperty({ description: 'Monto a cargar en centavos', example: 5000 })
    @IsInt()
    @IsPositive()
    amountCents: number;

    @ApiProperty({ example: 'topup-tx-1' })
    @IsString()
    @IsNotEmpty()
    idempotencyKey: string;
}