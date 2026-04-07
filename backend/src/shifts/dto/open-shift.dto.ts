import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
    @IsOptional()
    @IsString()
    openingNote?: string;

    // --- CORREGIDO (quitamos @IsString) ---
    @IsInt()
    @Min(0)
    @IsOptional() // Opcional, ya que tu servicio pone ?? 0
    openingFloat?: number;
}