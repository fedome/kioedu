import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123' })
  @IsString() @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString() @IsNotEmpty() @MinLength(8)
  newPassword: string;
}