# MiKioscoEdu — API Docs (Swagger/OpenAPI)

## Endpoints de documentación

- UI: `http://localhost:3000/api-docs`
- JSON: `http://localhost:3000/api-docs/openapi.json`

> Por defecto solo se exponen en entornos **no productivos** (`NODE_ENV !== 'production'`).

## Seguridad

La API utiliza **JWT Bearer**. En Swagger UI, presioná **Authorize** y pegá el token:


## Convenciones

- **Prefix**: Todas las rutas van bajo `/api/v1`.
- **Autenticación**: la mayoría de rutas requieren `@ApiBearerAuth('JWT')`.
- **RBAC**: se documenta con `@Roles(...)` y responde con `403` cuando el rol no alcanza.
- **Idempotencia** (POS): Header `Idempotency-Key` obligatorio para operaciones de débito/crédito.
- **Moneda**: `amountCents` en centavos ARS, salvo aclaración.

## Tags

- `Health`, `Auth`, `Accounts`, `Limits`, `POS`, `Reports`.

## Respuestas de error estándar

- `400 Bad Request`: Validaciones de DTO (class-validator).
- `401 Unauthorized`: JWT inválido o ausente.
- `403 Forbidden`: Falta de rol/permiso.
- `404 Not Found`: Recurso inexistente.
- `429 Too Many Requests`: Rate limit (POS).
- `409 Conflict`: Idempotencia/colisiones.
- `500 Internal Server Error`: Error no controlado.

## Exportar OpenAPI a archivo

```bash
EXPORT_OPENAPI=1 npm run start
# genera ./openapi.json


## `docs/api/style-guide.md`

```md
# Style Guide — Anotaciones Swagger en Nest

## Controladores
- Usar `@ApiTags('X')` por controlador/módulo.
- Rutas protegidas: `@ApiBearerAuth('JWT')` + `@UseGuards(...)` + `@Roles(...)`.
- Agregar `@ApiOperation({ summary: '...' })` claro y concreto.

## DTOs
- `@ApiProperty({ example, description })` en campos obligatorios.
- `@ApiPropertyOptional` para opcionales.
- Usar `class-validator` para coherencia (`IsInt`, `IsEmail`, `Min`, etc.).
- Evitar ejemplos con datos reales de producción.

## Headers y Query
- Headers especiales (p.ej. `Idempotency-Key`): `@ApiHeader(...)`.
- Query compleja (reports): `@ApiPropertyOptional` + `IsDateString`, `IsEnum`, etc.

## Respuestas
- `@ApiOkResponse({ type: ... })` en éxito.
- `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiTooManyRequestsResponse` cuando aplique.

## Versionado
- El prefijo global `/api/v1` ya está activado.
- Si aparece `/v2`, evaluá múltiples documentos o tags separados por versión.
