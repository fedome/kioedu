import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Request, BadRequestException, Query } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { TransferDto } from './dto/transfer.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@ApiTags('Children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('children')
export class ChildrenController {
    constructor(private readonly childrenService: ChildrenService) { }

    @Post()
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Registrar un nuevo hijo' })
    create(@Request() req, @Body() createChildDto: CreateChildDto) {
        const parentId = req.user.sub;
        return this.childrenService.create(parentId, createChildDto);
    }

    @Get('mine')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Obtener mis hijos' })
    findAllMyChildren(@Request() req) {
        const parentId = req.user.sub;
        return this.childrenService.findAllByParent(parentId);
    }

    @Patch(':id')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Actualizar datos de un hijo' })
    update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateChildDto: UpdateChildDto) {
        const parentId = req.user.sub;
        return this.childrenService.update(id, parentId, updateChildDto);
    }

    @Delete(':id')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Eliminar (desactivar) un hijo' })
    remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        const parentId = req.user.sub;
        return this.childrenService.remove(id, parentId);
    }

    @Post('transfer')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Transferir saldo entre hijos' })
    transfer(@Request() req, @Body() transferDto: TransferDto) {
        const parentId = req.user.sub;
        if (!transferDto || !transferDto.amountCents || transferDto.amountCents <= 0) {
            throw new BadRequestException('El monto a transferir debe ser mayor a 0');
        }
        return this.childrenService.transferBalance(parentId, transferDto);
    }

    @Patch(':id/card/block')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Bloquear o desbloquear la credencial' })
    toggleCardBlock(
        @Request() req, 
        @Param('id', ParseIntPipe) childId: number, 
        @Body('isBlocked') isBlocked: boolean
    ) {
        const parentId = req.user.sub;
        return this.childrenService.toggleCardBlock(childId, parentId, isBlocked);
    }

    // ── Card History ────────────────────────────────

    @Get(':id/card/events')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Historial de eventos de la tarjeta' })
    getCardEvents(@Request() req, @Param('id', ParseIntPipe) childId: number) {
        return this.childrenService.getCardEvents(childId, req.user.sub);
    }

    // ── Spending Summary ────────────────────────────

    @Get(':id/spending-summary')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Resumen de gastos por categoría' })
    getSpendingSummary(
        @Request() req,
        @Param('id', ParseIntPipe) childId: number,
        @Query('days') days?: string,
    ) {
        const d = days ? parseInt(days, 10) : 7;
        return this.childrenService.getSpendingSummary(childId, req.user.sub, Number.isNaN(d) ? 7 : d);
    }

    // ── Category Restrictions ───────────────────────

    @Get(':id/restrictions')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Ver restricciones de categoría del hijo' })
    getRestrictions(@Request() req, @Param('id', ParseIntPipe) childId: number) {
        return this.childrenService.getCategoryRestrictions(childId, req.user.sub);
    }

    @Post(':id/restrictions')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Agregar restricción de categoría' })
    addRestriction(
        @Request() req,
        @Param('id', ParseIntPipe) childId: number,
        @Body('categoryId', ParseIntPipe) categoryId: number,
    ) {
        return this.childrenService.addCategoryRestriction(childId, req.user.sub, categoryId);
    }

    @Delete(':id/restrictions/:categoryId')
    @Roles(Role.PARENT)
    @ApiOperation({ summary: 'Quitar restricción de categoría' })
    removeRestriction(
        @Request() req,
        @Param('id', ParseIntPipe) childId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
    ) {
        return this.childrenService.removeCategoryRestriction(childId, req.user.sub, categoryId);
    }
}
