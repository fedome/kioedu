import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, Min, ValidateNested, IsString, IsBoolean } from 'class-validator';

export class TransactionItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ description: 'Cantidad vendida' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario al momento de la venta (snapshot)' })
  @IsInt()
  @Min(0)
  unitPriceCents: number;
}

export class CreateTransactionDto {
  @ApiPropertyOptional({
    description: 'ID del Alumno (Child) si la venta es con Saldo (CARD). Dejar vacío si es Efectivo anónimo.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  childId?: number;

  @ApiProperty({ type: [TransactionItemDto], description: 'Lista de productos a vender' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @ApiProperty({ description: 'Total esperado en centavos (para validación de seguridad)' })
  @IsInt()
  @Min(0)
  totalCents: number;

  @ApiPropertyOptional({ description: 'Indica si la venta se generó Offline' })
  @IsOptional()
  @IsBoolean()
  isOffline?: boolean;

  @ApiPropertyOptional({ description: 'Método de pago explícito', enum: ['CASH', 'CARD', 'ACCOUNT', 'TRANSFER', 'MERCADOPAGO'] })
  @IsOptional()
  @IsString()
  paymentMethod?: 'CASH' | 'CARD' | 'ACCOUNT' | 'TRANSFER' | 'MERCADOPAGO';

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

  @ApiPropertyOptional({ description: 'Clave de idempotencia para evitar duplicados (offline sync)' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}