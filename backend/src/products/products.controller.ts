import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query, Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CashierJwtGuard } from '../pos/cashier-jwt.guard';
import { AddStockDto } from './dto/add-stock.dto';

@ApiTags('Products (Catálogo)')
@ApiBearerAuth('JWT')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Get('lookup')
  @UseGuards(CashierJwtGuard, RolesGuard)
  @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
  @ApiOperation({ summary: 'V2: Buscar producto por código de barras (Escáner)' })
  findByBarcode(@Query('barcode') barcode: string, @Req() req: any) {
    return this.productsService.findByBarcode(barcode, req.user.ownerId);
  }

  @Get('dashboard-metrics')
  @UseGuards(CashierJwtGuard)
  @ApiOperation({ summary: 'Métricas para el Home (Stock bajo y Vencimientos)' })
  getDashboardMetrics(@Req() req: any) {
    return this.productsService.getDashboardMetrics(req.user.ownerId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.ENCARGADO)
  @ApiOperation({ summary: 'Listar productos (soporta ?search y ?lowStock=true)' })
  findAll(
    @Query('search') search: string | undefined,
    @Query('lowStock') lowStock: string | undefined,
    @Query('lastSync') lastSync: string | undefined,
    @Req() req: any
  ) {
    return this.productsService.findAll(search, lowStock === 'true', lastSync, req.user.ownerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    return this.productsService.create(createProductDto, req.user.ownerId);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ENCARGADO)
  @ApiOperation({ summary: 'Importar productos masivamente desde Excel' })
  bulkCreate(@Body() productsDto: CreateProductDto[], @Req() req: any) {
    return this.productsService.bulkCreate(productsDto, req.user.ownerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.ENCARGADO)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.productsService.findOne(id, req.user.ownerId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.productsService.update(id, updateProductDto, req.user.ownerId, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.ENCARGADO)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.productsService.remove(id, req.user.ownerId);
  }

  @Post(':id/stock')
  @UseGuards(JwtAuthGuard)
  async addStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddStockDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const expiration = dto.expirationDate ? new Date(dto.expirationDate) : undefined;
    return this.productsService.addStock(id, dto, userId, req.user.ownerId, expiration);
  }

  @Post(':id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ENCARGADO)
  @ApiOperation({ summary: 'Ajuste manual de stock (Inventario Físico)' })
  async reconcile(
    @Param('id', ParseIntPipe) id: number,
    @Body('physicalStock', ParseIntPipe) physicalStock: number,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.productsService.reconcile(id, physicalStock, reason, req.user.ownerId, userId);
  }
}