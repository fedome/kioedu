import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Role } from '../../auth/roles.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'cajero1@demo.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    type: [String],
    example: [Role.CASHIER],
  })
  @IsOptional()
  roles?: Role[];
}