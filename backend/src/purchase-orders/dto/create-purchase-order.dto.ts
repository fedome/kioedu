import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// Este DTO define un ítem *dentro* de la orden de compra
class CreatePurchaseOrderItemDto {
  @ApiProperty({ description: 'ID del Producto a comprar', example: 1 })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ description: 'Cantidad comprada', example: 100 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Costo por unidad (en centavos)', example: 750 })
  @IsInt()
  @Min(0)
  unitCostCents: number;
}

// Este es el DTO principal para crear la Orden de Compra
export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID del Proveedor (Supplier)', example: 1 })
  @IsInt()
  @IsPositive()
  supplierId: number;

  @ApiPropertyOptional({
    description: 'Estado inicial (ej. DRAFT o SUBMITTED)',
    example: 'SUBMITTED',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    type: [CreatePurchaseOrderItemDto],
    description: 'Lista de productos en la orden',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}