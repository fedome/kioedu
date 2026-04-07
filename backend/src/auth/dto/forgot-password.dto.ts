import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'padre@gmail.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  email: string;
}
