import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CashierLoginDto {
    @ApiProperty({ example: 'cajero@escuela.edu' })
    @IsEmail() email: string;

    @ApiProperty({ example: '********' })
    @IsString() @MinLength(6) password: string;
}
