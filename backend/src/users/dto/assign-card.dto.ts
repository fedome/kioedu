import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AssignCardDto {
  @ApiProperty({
    description: 'UID Hexadecimal de la tarjeta Mifare',
    example: '04A1B2C3D4E5'
  })
  @IsString()
  @IsNotEmpty()
    // Opcional: Validar longitud si sabes que siempre son 8, 14 o 20 caracteres
    // @Length(8, 20)
  uidHex: string;
}