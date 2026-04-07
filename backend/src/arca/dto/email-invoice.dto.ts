import { IsInt, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailInvoiceDto {
    @ApiProperty({ description: 'ID de la transacción' })
    @IsInt()
    @IsNotEmpty()
    transactionId: number;

    @ApiProperty({ description: 'Email del destinatario' })
    @IsEmail()
    @IsNotEmpty()
    recipientEmail: string;
}
