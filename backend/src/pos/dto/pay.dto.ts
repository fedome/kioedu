import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PayDto {
  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Clave de idempotencia única',
    example: 'pay-tx-1-abcdef',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional({ description: 'Indica si se debe facturar esta venta en ARCA' })
  @IsOptional()
  @IsBoolean()
  shouldInvoice?: boolean;

  @ApiPropertyOptional({ description: 'Tipo de documento del cliente (ARCA)' })
  @IsOptional()
  @IsInt()
  clientDocType?: number;

  @ApiPropertyOptional({ description: 'Número de documento del cliente (ARCA)' })
  @IsOptional()
  @IsString()
  clientDocNumber?: string;
}