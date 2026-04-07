// src/limits/dto/set-limit.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class SetLimitDto {
    @ApiProperty({
        nullable: true,
        description: 'Límite diario en centavos. Null = sin límite.',
        example: 5000,
    })
    @IsOptional()   // permitimos null
    @IsInt()        // si viene, tiene que ser entero
    limitCents: number | null;
}

export class LimitResponseDto {
    @ApiProperty()
    childId: number;

    @ApiProperty({
        nullable: true,
        description: 'Límite diario en centavos. Null = sin límite.',
    })
    limitCents: number | null;

    @ApiProperty()
    updatedAt: Date;
}
