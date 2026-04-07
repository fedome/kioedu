import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Query, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Endpoint para recibir notificaciones de MercadoPago.
   * Protegido por un secreto compartido en el query param.
   * Ej: POST /webhooks/mercadopago?kioskId=5&secret=MI_SECRETO
   */
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Query('kioskId') kioskId: string,
    @Query('secret') secret: string,
    @Body() payload: any
  ) {
    // Validar secreto compartido
    const expectedSecret = this.config.get<string>('WEBHOOK_SECRET') || 'changeme_webhook_secret';
    if (!secret || secret !== expectedSecret) {
      this.logger.warn('Webhook rechazado: secreto inválido');
      throw new ForbiddenException('Invalid webhook secret');
    }

    if (!kioskId || isNaN(parseInt(kioskId, 10))) {
      this.logger.warn('Webhook rechazado: kioskId inválido');
      return { status: 'ignored' };
    }

    const parsedKioskId = parseInt(kioskId, 10);
    const action = payload.action || payload.type;

    if (action === 'subscription_cancelled' || action === 'payment_rejected') {
      this.logger.log(`Suspensión automática: Kiosco #${parsedKioskId}`);
      try {
        // @ts-ignore
        await this.prisma.kiosk.update({
          where: { id: parsedKioskId },
          data: { subscriptionActive: false }
        });
      } catch (err) {
        this.logger.error(`Falló suspensión del kiosco #${parsedKioskId}`);
      }
    } else if (action === 'subscription_authorized' || action === 'payment_approved') {
      this.logger.log(`Activación automática: Kiosco #${parsedKioskId}`);
      try {
        // @ts-ignore
        await this.prisma.kiosk.update({
          where: { id: parsedKioskId },
          data: { subscriptionActive: true }
        });
      } catch (err) {}
    }

    return { received: true };
  }
}

