import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
    @IsInt()
    @Min(0)
    countedCash: number; // Dinero contado (centavos)

    @IsOptional()
    @IsString()
    closingNote?: string;
}