import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterBusinessDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del dueño del negocio' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'juan@micolegio.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MiPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Colegio San Martín', description: 'Nombre del colegio/institución' })
  @IsString()
  @IsNotEmpty()
  schoolName: string;

  @ApiProperty({ example: 'Kiosco Principal', description: 'Nombre del kiosco/punto de venta', required: false })
  @IsString()
  @IsOptional()
  kioskName?: string;
}
