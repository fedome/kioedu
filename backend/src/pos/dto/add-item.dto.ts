import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddItemDto {
  @ApiPropertyOptional({
    description: 'ID del Producto (si se escanea o selecciona del catálogo)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  productId?: number;

  @ApiProperty({
    description: 'Cantidad del producto',
    example: 2,
  })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description:
      "Descripción manual (para 'Varios' o si no se usa productId)",
    example: 'Alfajor triple',
  })
  @ValidateIf((o) => !o.productId) // Requerido si no hay productId
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    description: "Precio manual (para 'Varios' o si se anula el precio)",
    example: 550,
  })
  @ValidateIf((o) => !o.productId) // Requerido si no hay productId
  @IsInt()
  @Min(0)
  overridePriceCents?: number;
}