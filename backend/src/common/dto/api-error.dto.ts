import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
    @ApiProperty({ example: 400 }) statusCode: number;
    @ApiProperty({ example: 'Bad Request' }) error: string;
    @ApiProperty({ example: 'Validation failed' }) message: string | string[];
    @ApiPropertyOptional({ example: 'REQ-8f3a1b' }) requestId?: string;
}
