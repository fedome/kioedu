import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ChatMessageDto {
    @ApiProperty({ enum: ['user', 'model'] })
    @IsString()
    role: 'user' | 'model';

    @ApiProperty()
    @IsString()
    content: string;
}

export class AiChatDto {
    @ApiProperty({ description: 'Mensaje del usuario' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiPropertyOptional({ description: 'Historial de conversación previo', type: [ChatMessageDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    history?: ChatMessageDto[];
}

export class AiEnhancePromptDto {
    @ApiProperty({ description: 'Nombre del producto para generar un prompt de imagen' })
    @IsString()
    @IsNotEmpty()
    productName: string;
}
