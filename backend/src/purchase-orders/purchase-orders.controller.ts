import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { ApiCommonErrors } from '../common/swagger.decorators';

@ApiTags('Purchase Orders (Admin)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER) // Los encargados y cajeros también ven listas
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva Orden de Compra' })
  @ApiCreatedResponse()
  @ApiCommonErrors()
  create(@Body() createDto: CreatePurchaseOrderDto) {
    return this.poService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las Órdenes de Compra' })
  findAll() {
    return this.poService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una Orden de Compra' })
  @ApiCommonErrors()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findOne(id);
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  @ApiOperation({ summary: 'Marcar una Orden de Compra como Enviada' })
  submitOrder(@Param('id', ParseIntPipe) id: number) {
    return this.poService.submitOrder(id);
  }

  @Post(':id/receive')
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  @ApiOperation({
    summary: 'Marcar una Orden de Compra como Recibida',
    description: 'Esto actualiza el stock, el costo y crea lotes de productos.',
  })
  @ApiCommonErrors()
  receiveOrder(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: { items: any[] }) {
    const userId = req.user.sub; // ID del Admin que aprueba
    return this.poService.receiveOrder(id, userId, body.items || []);
  }

  // --- Shopping List Endpoints ---

  @Get('drafts/all')
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener todas las listas de compra (Borradores)' })
  getDrafts() {
    return this.poService.getDrafts();
  }

  @Post('drafts/add-item')
  @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
  @ApiOperation({ summary: 'Agregar un ítem a la lista de compra del proveedor' })
  addToDraft(@Body() body: { supplierId: number; productId: number; quantity: number }) {
    return this.poService.addToDraft(body);
  }
}