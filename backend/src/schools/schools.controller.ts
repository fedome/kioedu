import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  /**
   * Público: buscar colegio por código de invitación.
   * GET /schools/lookup?code=COLE2025
   */
  @Get('lookup')
  async lookupByCode(@Query('code') code: string) {
    return this.schoolsService.findByInviteCode(code);
  }

  // ── Admin endpoints ──────────────────────────────

  /** GET /schools (admin: listar todos) */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.schoolsService.findAll();
  }

  /** POST /schools (admin: crear colegio) */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Body() body: { name: string; address?: string; inviteCode?: string },
  ) {
    return this.schoolsService.create(body);
  }

  /** PATCH /schools/:id (admin: editar colegio) */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; address?: string; inviteCode?: string },
  ) {
    return this.schoolsService.update(id, body);
  }

  /** DELETE /schools/:id (admin: eliminar colegio) */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.schoolsService.delete(id);
  }
}
