import { Body, Controller, Post, Req, UseGuards, Headers, Logger, HttpStatus, HttpCode, ForbiddenException, Query } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateTopupDto } from '../payments/dto/create-topup.dto';
import { ConfigService } from '@nestjs/config';

@Controller('mercadopago')
export class MercadoPagoController {
    private readonly logger = new Logger(MercadoPagoController.name);

    constructor(
        private readonly mpService: MercadoPagoService,
        private readonly paymentsService: PaymentsService,
        private readonly configService: ConfigService,
    ) { }

    @Post('preference')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.PARENT)
    async createPreference(@Body() dto: CreateTopupDto, @Req() req: any) {
        const transaction = await this.paymentsService.createPendingTopup(dto, req.user.sub, req.user.role) as any;

        if (!transaction || !transaction.account || !transaction.account.child || !transaction.account.owner) {
            throw new Error('Datos de transacción incompletos para generar preferencia.');
        }

        const mpToken = transaction.account.owner.mpAccessToken;
        if (!mpToken) {
             throw new Error('Este colegio/kiosco aún no tiene configurado los cobros con MercadoPago.');
        }

        const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8100';
        const webhookUrl = this.configService.get<string>('MP_WEBHOOK_URL') || '';

        const preference = await this.mpService.createTopupPreference({
            accessToken: mpToken,
            transactionId: transaction.id,
            childName: `${transaction.account.child.firstName} ${transaction.account.child.lastName}`,
            amountCents: transaction.totalCents,
            backUrls: {
                success: `${baseUrl}/dashboard?status=success`,
                pending: `${baseUrl}/dashboard?status=pending`,
                failure: `${baseUrl}/dashboard?status=error`,
            },
            notificationUrl: webhookUrl ? `${webhookUrl}?trxId=${transaction.id}` : undefined,
        });

        return preference;
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Body() body: any,
        @Headers('x-signature') signature: string,
        @Headers('x-request-id') requestId: string,
        @Query('trxId') trxId?: string,
    ) {
        this.logger.log(`Webhook recibido de Mercado Pago: ${JSON.stringify(body)}`);

        // 1. Validar firma HMAC
        const dataId = body.data?.id?.toString() || '';
        const isValid = this.mpService.validateWebhookSignature(signature, requestId, dataId);
        if (!isValid) {
            this.logger.warn(`Webhook rechazado: firma HMAC inválida`);
            throw new ForbiddenException('Invalid webhook signature');
        }

        // 2. Procesar solo notificaciones de pago
        const paymentId = body.data?.id || (body.type === 'payment' ? body.resource?.split('/').pop() : null);
        
        if (body.type === 'payment' && paymentId) {
            try {
                const transactionId = parseInt(trxId as string, 10);
                if (!transactionId || isNaN(transactionId)) {
                    this.logger.warn(`No se recibió trxId en el query string para pago #${paymentId}`);
                    return { received: true };
                }

                const ownerToken = await this.paymentsService.getOwnerMpTokenByTransaction(transactionId);
                if (!ownerToken) {
                    this.logger.warn(`No se pudo obtener mpAccessToken para trx #${transactionId}`);
                    return { received: true };
                }

                const payment = await this.mpService.getPayment(paymentId, ownerToken);
                
                if (payment.status === 'approved') {
                    const refId = parseInt(payment.external_reference as string, 10);
                    if (!isNaN(refId)) {
                        this.logger.log(`Pago aprobado para transacción #${refId}. Impactando saldo...`);
                        await this.paymentsService.completeTopupPayment(refId, paymentId);
                    }
                }
            } catch (error) {
                this.logger.error(`Error procesando webhook de MP: ${error.message}`);
            }
        }

        return { received: true };
    }
}
