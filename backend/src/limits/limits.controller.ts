// src/limits/limits.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetLimitDto, LimitResponseDto } from './dto/set-limit.dto';

// --- AÑADIDO ---
import { LimitsService } from './limits.service';
import { Role } from '../auth/roles.enum';
// ---------------

@ApiTags('Limits')
@ApiBearerAuth('JWT')
// 1. Aplicamos los guardianes a todo el controlador
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('limits')
export class LimitsController {

  // 2. Inyectamos el servicio
  constructor(private limits: LimitsService) { }

  @Get(':childId')
  // 3. Roles específicos para GET
  @Roles(Role.ADMIN, Role.CASHIER, Role.PARENT)
  @ApiOperation({ summary: 'Obtener límite diario (Admin, Parent)' })
  @ApiParam({ name: 'childId', type: Number, example: 1 })
  @ApiOkResponse({ type: LimitResponseDto })
  async getLimit( // <-- 4. Añadido async
    @Param('childId', ParseIntPipe) childId: number,
  ): Promise<{ childId: number; limitCents: any }> { // <-- 5. Añadido Promise
    // --- CONECTADO AL SERVICIO ---
    return this.limits.getDailyLimit(childId);
  }

  @Put(':childId')
  @Roles(Role.ADMIN, Role.CASHIER, Role.PARENT)
  @ApiOperation({ summary: 'Actualizar límite diario' })
  @ApiParam({ name: 'childId', type: Number, example: 1 })
  @ApiOkResponse({ type: LimitResponseDto })
  async setLimit(
    @Param('childId', ParseIntPipe) childId: number,
    @Body() dto: SetLimitDto,
    @Req() req: any,
  ): Promise<LimitResponseDto> {
    const result = await this.limits.setDailyLimit(childId, dto.limitCents, req.user);
    // adaptás esto a tu DTO real
    return {
      childId: result.childId,
      limitCents: result.limitCents,
      updatedAt: result.updatedAt,
    };
  }
}