import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsInt } from 'class-validator';
import { Role } from '../../auth/roles.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'cajero1@demo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña temporal. El usuario debería cambiarla.',
    example: 'NewCashier1234',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    type: [String],
    example: [Role.CASHIER],
    default: [Role.CASHIER],
  })
  @IsOptional()
  roles?: Role[];

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsOptional()
  schoolId?: number;
}