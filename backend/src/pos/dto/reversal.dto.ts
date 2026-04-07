import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReversalDto {
    @ApiProperty({ example: 123, description: 'ID de la transacción DEBIT a revertir' })
    @IsInt() @Min(1)
    transactionId: number;

    @ApiPropertyOptional({ example: 'Compra mal cargada' })
    @IsOptional() @IsString()
    reason?: string;
}

export class ReversalResponseDto {
    @ApiProperty({ example: 10 }) id: number;
    @ApiProperty({ example: 123 }) originalTransactionId: number;
    @ApiProperty({ example: 456 }) reversalTransactionId: number;

    @ApiProperty({ example: 17 }) accountId: number;
    @ApiProperty({ example: 7, nullable: true }) kioskId: number | null;
    @ApiProperty({ example: 12, nullable: true }) cashierUserId: number | null;

    @ApiProperty({ example: 2500 }) amountCents: number;
    @ApiProperty({ example: 'Compra mal cargada', nullable: true }) reason?: string;

    @ApiProperty({ example: '2025-10-27T19:45:10.123Z' }) createdAt: string;
}
