import { Body, Controller, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { ApiCommonErrors } from '../common/swagger.decorators';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }

  @Post('topup')
  @Roles(Role.ADMIN, Role.PARENT) // Solo padres o admins
  @ApiOperation({ summary: 'Recargar saldo (Simulación de pago online)' })
  @ApiCommonErrors()
  createTopup(@Body() dto: CreateTopupDto, @Req() req: any) {
    // req.user has 'roles' (array), we extract the first one
    const userRole = req.user.roles?.[0] || Role.PARENT;
    return this.paymentsService.createTopup(dto, req.user.sub, userRole as Role);
  }

  @Post('topup/:id/cancel')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Cancelar una recarga pendiente' })
  cancelTopup(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.paymentsService.cancelTopup(id, req.user.sub);
  }
}