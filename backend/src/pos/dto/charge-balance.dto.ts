import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class ChargeBalanceDto {
  @ApiProperty({ description: 'Monto a cargar en centavos', example: 50000 })
  @IsInt()
  @IsPositive()
  amountCents: number;

  @ApiPropertyOptional({ description: 'ID del alumno (si se busca manual)', example: 10 })
  @IsOptional()
  @IsInt()
  childId?: number;

  @ApiPropertyOptional({ description: 'UID de la tarjeta (si se escanea)', example: 'a1b2c3d4' })
  @IsOptional()
  @IsString()
  cardUid?: string;
}