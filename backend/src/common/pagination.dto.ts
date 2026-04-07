import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadatos de paginación estándar para respuestas listadas.
 */
export class PageMetaDto {
    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 50 })
    limit: number;

    @ApiProperty({ example: 200 })
    total: number;

    @ApiProperty({ example: 4 })
    totalPages: number;
}

/**
 * Contenedor genérico de respuesta paginada.
 * Nota: Swagger no “entiende” genéricos. En @ApiOkResponse podés usar:
 * - `as any`, o
 * - armar una clase concreta que extienda este shape.
 */
export class PagedResponseDto<T> {
    @ApiProperty({ type: PageMetaDto })
    meta: PageMetaDto;

    // Para Swagger, si querés schema preciso, creá una clase concreta por recurso.
    @ApiProperty({ isArray: true })
    items: T[];
}
