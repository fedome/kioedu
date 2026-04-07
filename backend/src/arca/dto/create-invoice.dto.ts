import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
    @ApiProperty({ description: 'ID de la transacción a facturar' })
    @IsInt()
    transactionId: number;

    @ApiPropertyOptional({ description: 'Tipo de documento del receptor (80=CUIT, 96=DNI, 99=Consumidor Final)' })
    @IsOptional()
    @IsInt()
    docType?: number;

    @ApiPropertyOptional({ description: 'Número de documento del receptor' })
    @IsOptional()
    @IsString()
    docNumber?: string;
}
