import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportTransactionItemDto {
    @ApiProperty({ example: 'tx_01HF...' }) id: string;

    @ApiProperty({ example: 17 }) accountId: number;

    @ApiProperty({ example: 42, nullable: true }) childId: number | null;

    @ApiProperty({ example: 7, nullable: true }) kioskId: number | null;

    @ApiProperty({ example: 12, nullable: true }) cashierUserId: number | null;

    @ApiProperty({ example: 'DEBIT', enum: ['DEBIT','CREDIT'] })
    type: 'DEBIT' | 'CREDIT';

    @ApiProperty({ example: 2500 }) amountCents: number;

    @ApiProperty({ example: '2025-10-27T19:45:10.123Z' })
    createdAt: string;

    @ApiPropertyOptional({ example: 'Snack medialuna' })
    reference?: string;
}
