import { ApiProperty } from '@nestjs/swagger';

export class PageMetaDto {
    @ApiProperty({ example: 1 }) page: number;
    @ApiProperty({ example: 50 }) pageSize: number;
    @ApiProperty({ example: 200 }) total: number;
    @ApiProperty({ example: 4 }) totalPages: number;
}
