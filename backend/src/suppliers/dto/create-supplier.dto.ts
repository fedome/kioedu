import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSupplierDto {
    @ApiProperty({ example: 'Distribuidora del Norte', description: 'Nombre del proveedor' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: '1112345678', description: 'Celular (sin 0, sin 15, formato 11XXXXXXXX)' })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.replace(/[^0-9]/g, '') || null) // Limpiamos todo lo que no sea número
    phone?: string;

    @ApiPropertyOptional({ example: 'contacto@distribuidora.com', description: 'Email de contacto' })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    email?: string;

    @ApiPropertyOptional({ example: 'Av. Corrientes 1234', description: 'Dirección física' })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    address?: string;

    @ApiPropertyOptional({ example: '20123456789', description: 'CUIT / RUT (Solo números)' })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.replace(/[^0-9]/g, '') || null) // Limpiamos guiones
    cuit?: string;

    @ApiPropertyOptional({ example: 'Lunes y Jueves', description: 'Días habituales de visita' })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    visitDays?: string;

    @ApiPropertyOptional({ description: 'Notas internas (Legacy)' })
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value === '' ? null : value)
    contactInfo?: string;
}
