import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    password: string;

    // El rol se asigna siempre como PARENT desde el backend.
    // Nunca permitir que el cliente elija su propio rol.
}
