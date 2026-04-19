import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe, BadRequestException, Req } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'Crear nuevo proveedor' })
    async create(@Body() createSupplierDto: CreateSupplierDto, @Req() req: any) {
        try {
            return await this.suppliersService.create(createSupplierDto, req.user.ownerId);
        } catch (error: any) {
            throw new BadRequestException(error.message);
        }
    }

    @Get()
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'Listar proveedores (búsqueda opcional)' })
    @ApiQuery({ name: 'q', required: false, description: 'Buscar por nombre o cuit' })
    findAll(@Query('q') q: string | undefined, @Req() req: any) {
        return this.suppliersService.findAll(q, req.user.ownerId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'Obtener detalle de proveedor' })
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.suppliersService.findOne(id, req.user.ownerId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'Actualizar proveedor' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateSupplierDto: UpdateSupplierDto, @Req() req: any) {
        return this.suppliersService.update(id, updateSupplierDto, req.user.ownerId);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER) // Admin, Encargado y Cashier pueden eliminar
    @ApiOperation({ summary: 'Eliminar proveedor (si no tiene compras)' })
    async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        try {
            return await this.suppliersService.remove(id, req.user.ownerId);
        } catch (e: any) {
            throw new BadRequestException(e.message);
        }
    }
}
