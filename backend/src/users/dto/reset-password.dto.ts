import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'La nueva contraseña para el usuario',
    example: 'NewStrongPass1234!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}