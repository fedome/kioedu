// src/auth/dto/token.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
    @ApiProperty()
    access_token: string;

    @ApiProperty({ example: 'Bearer' })
    token_type: 'Bearer';

    @ApiProperty({ example: 900, description: 'Segundos hasta la expiración' })
    expires_in: number;
}
