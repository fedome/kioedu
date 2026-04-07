import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta de saldo de cuenta (en centavos ARS)
 */
export class BalanceResponseDto {
    @ApiProperty({ example: 12500, description: 'Saldo en centavos (ARS)' })
    balanceCents: number;

    @ApiProperty({ example: 'ARS' })
    currency: string;
}
