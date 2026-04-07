// src/notifications/notifications.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Patch,
  ParseIntPipe,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post('device-tokens')
  async registerToken(@Req() req: any, @Body() dto: RegisterDeviceTokenDto) {
    const userId = req.user.id; // como ya usás en otros lados

    return this.notifications.registerDeviceToken({
      userId,
      token: dto.token,
      platform: dto.platform,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar historial de notificaciones del usuario' })
  list(
    @Req() req: any,
    @Query('kind') kind?: 'MOVEMENT' | 'LOW_BALANCE' | 'LIMIT_REACHED' | 'NEWS',
    @Query('onlyUnread') onlyUnread?: 'true' | 'false',
  ) {
    return this.notifications.listForUser({
      userId: req.user.id,
      kind,
      onlyUnread: onlyUnread === 'true',
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  markRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.markAsRead(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación del historial' })
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notifications.softDelete(req.user.id, id);
  }

}
