import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsDateString, IsString, Min } from 'class-validator';

export class AddStockDto {
  @ApiProperty({ description: 'Cantidad a agregar', example: 24 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Costo unitario en centavos', example: 8500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  // --- CAMPOS DE GESTIÓN AVANZADA ---

  @ApiPropertyOptional({ description: 'Nombre del Proveedor', example: 'Distribuidora Norte' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Número de Factura o Remito', example: '0001-00002544' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Notas u observaciones', example: 'Llegó con el empaque dañado' })
  @IsOptional()
  @IsString()
  notes?: string;
}