import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDecimal,
  IsInt,
  IsNotEmpty, IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Alfajor Triple' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Código de barras (EAN-13)', example: '7790123456789' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiPropertyOptional({ description: 'SKU interno', example: 'ALFA-003' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Alerta de stock mínimo', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiProperty({ description: 'Precio de venta en centavos', example: 1200 })
  @IsInt()
  @IsPositive()
  priceCents: number;

  // --- AÑADIDO: El campo que faltaba ---
  @ApiPropertyOptional({ description: 'Costo del producto en centavos', example: 800 })
  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ description: 'Categoría del producto (String Legacy)', example: 'Golosinas' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría (Relación)', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'URL de la imagen del producto', example: 'https://ejemplo.com/imagen.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
  // ------------------------------------

  @ApiPropertyOptional({ description: 'Tasa de impuesto (ej. 0.21)', example: 0 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  taxRate?: number;

  @ApiPropertyOptional({ description: '¿Este producto rastrea stock?', example: true })
  @IsBoolean()
  @IsOptional()
  trackStock?: boolean;

  @ApiPropertyOptional({ description: 'Cantidad de stock inicial', example: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'ID del proveedor principal (para reposición automática)', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  supplierId?: number;

  @ApiPropertyOptional({ description: '¿Está activo para la venta?', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// UpdateProductDto hereda el campo nuevo
export class UpdateProductDto extends CreateProductDto { }