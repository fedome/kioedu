import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateChildDto {
  @ApiProperty({ example: 'Pepito' })
  @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @IsNotEmpty()
  lastName: string;

  // --- NUEVOS CAMPOS ---
  @ApiPropertyOptional({ enum: DocumentType, example: 'DNI' })
  @IsOptional() @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional() @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: '2015-05-20' })
  @IsOptional() @IsDateString()
  dateOfBirth?: string; // Recibimos fecha como ISO String

  @ApiPropertyOptional({ example: '3ro' })
  @IsOptional() @IsString()
  grade?: string;

  @ApiPropertyOptional({ example: 'B' })
  @IsOptional() @IsString()
  division?: string;
}