import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({ description: 'ID del Alumno a recargar', example: 1 })
  @IsInt()
  @IsPositive()
  childId: number;

  @ApiProperty({ description: 'Monto a cargar en centavos', example: 10000 })
  @IsInt()
  @IsPositive()
  amountCents: number;

  @ApiProperty({ description: 'Método de pago', example: 'mp' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  paymentMethod: string;
}