import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PagedTransactionsResponseDto } from './dto/paged-transactions-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // (Asumiendo la nueva ruta de AuthModule)
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.enum';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
    constructor(private reports: ReportsService) { }

    @Roles(Role.ADMIN, Role.CASHIER, Role.ENCARGADO)
    @Get('transactions')
    @ApiOperation({ summary: 'V2: Listar transacciones (paginado y filtrado)' })
    @ApiOkResponse({ type: PagedTransactionsResponseDto })
    async list(@Query() query: ReportQueryDto) {
        // El servicio V2 ahora solo tiene 'list'
        return this.reports.list(query);
    }

    /**
     * GET /api/v1/reports/profitability
     * Reporte de rentabilidad (Ventas vs Costos)
     */
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @Get('profitability')
    @ApiOperation({ summary: 'Reporte de Rentabilidad (Ventas vs Costos)' })
    @ApiOkResponse({ description: 'Resumen de ventas, costos y ganancia neta.' })
    async getProfitability(@Query() query: ReportQueryDto) {
        return this.reports.getProfitabilitySummary(query);
    }

    /**
     * GET /api/v1/reports/top-products
     * Productos más vendidos en un rango de fechas
     */
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @Get('top-products')
    @ApiOperation({ summary: 'Top 10 productos más vendidos' })
    @ApiOkResponse({ description: 'Lista de productos ordenados por cantidad vendida.' })
    async getTopProducts(@Query() query: ReportQueryDto) {
        return this.reports.getTopProducts(query);
    }

    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @Get('inventory-valuation')
    @ApiOperation({ summary: 'Valorización de inventario actual' })
    @ApiOkResponse({ description: 'Total preventa, costo y margen potencial del stock actual.' })
    async getInventoryValuation() {
        return this.reports.getInventoryValuation();
    }

    @Roles(Role.ADMIN, Role.ENCARGADO)
    @Get('purchase-suggestions')
    @ApiOperation({ summary: 'Sugerencias de compra por stock bajo' })
    @ApiOkResponse({ description: 'Lista de productos agrupados por proveedor que requieren reposición.' })
    async getPurchaseSuggestions() {
        return this.reports.getPurchaseSuggestions();
    }
}