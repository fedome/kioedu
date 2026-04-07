import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiTooManyRequestsResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from './dto/api-error.dto';

export const ApiIdempotencyHeader = () =>
    applyDecorators(
        ApiHeader({
            name: 'Idempotency-Key',
            required: true,
            description: 'UUID único por intento. Reutilizar para reintentos del mismo evento.',
            schema: { type: 'string', example: '03b3d7b8-22d4-4a6f-8c7a-774f4d76d8a1' },
        }),
        ApiConflictResponse({ description: 'Duplicado (idempotencia detectada)', type: ApiErrorDto }),
    );

export const ApiKioskApiKeyHeader = () =>
    applyDecorators(
        ApiHeader({
            name: 'x-api-key',
            required: true,
            description: 'API Key del Kiosco (solo para login y operaciones con API Key).',
            schema: { type: 'string', example: 'kiosk_live_xxx' },
        }),
    );

export const ApiCommonErrors = () =>
    applyDecorators(
        ApiBadRequestResponse({ type: ApiErrorDto }),
        ApiUnauthorizedResponse({ type: ApiErrorDto }),
        ApiForbiddenResponse({ type: ApiErrorDto }),
        ApiTooManyRequestsResponse({ type: ApiErrorDto }),
    );

export const ApiJWT = () => ApiBearerAuth('JWT');
