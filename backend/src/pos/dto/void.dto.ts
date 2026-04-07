import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidDto {
  @ApiProperty({
    description: 'Razón de la anulación (obligatoria)',
    example: 'Error de cobro, cliente se arrepintió.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}