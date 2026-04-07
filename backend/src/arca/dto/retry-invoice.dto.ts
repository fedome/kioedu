import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RetryInvoiceDto {
    @ApiProperty({ description: 'ID de la transacción a re-facturar' })
    @IsInt()
    @IsNotEmpty()
    transactionId: number;
}
