import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateChildDto {
    @ApiProperty({ example: 'Lionel', description: 'Nombre del alumno' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Messi', description: 'Apellido del alumno' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiPropertyOptional({ example: 1, description: 'ID de la escuela' })
    @IsOptional()
    schoolId?: number;

    @ApiPropertyOptional({ example: 'COLE123', description: 'Código de invitación del colegio' })
    @IsString()
    @IsOptional()
    inviteCode?: string;

    @ApiPropertyOptional({ enum: DocumentType, description: 'Tipo de documento' })
    @IsEnum(DocumentType)
    @IsOptional()
    documentType?: DocumentType;

    @ApiPropertyOptional({ example: '40123456', description: 'Número de documento' })
    @IsString()
    @IsOptional()
    documentNumber?: string;

    @ApiPropertyOptional({ example: '2015-06-24', description: 'Fecha de nacimiento' })
    @IsDateString()
    @IsOptional()
    dateOfBirth?: string;

    @ApiPropertyOptional({ example: '5to A', description: 'Grado/Curso' })
    @IsString()
    @IsOptional()
    grade?: string;

    @ApiPropertyOptional({ example: 'Mañana', description: 'División/Turno' })
    @IsString()
    @IsOptional()
    division?: string;
}
