# Checklist para nuevas rutas

- [ ] Agregué `@ApiTags('X')`.
- [ ] Documenté seguridad si aplica: `@ApiBearerAuth('JWT')`.
- [ ] DTOs con `@ApiProperty`/`@ApiPropertyOptional` y `class-validator`.
- [ ] Ejemplo en body / query / headers si ayuda a QA/front.
- [ ] Respuestas: `@ApiOkResponse(...)` y errores relevantes (`400/401/403/429/409`).
- [ ] Si es POS y es mutación: `@ApiHeader('Idempotency-Key')`.
- [ ] Revisé que el path esté bajo `/api/v1`.
