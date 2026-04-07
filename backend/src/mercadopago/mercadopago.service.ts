import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MercadoPagoService {
    private readonly logger = new Logger(MercadoPagoService.name);
    private readonly accessToken: string;
    private readonly webhookSecret: string;

    constructor(private configService: ConfigService) {
        this.webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET') || '';
    }

    private getClient(accessToken: string): MercadoPagoConfig {
        return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    }

    /**
     * Validate MercadoPago webhook signature (HMAC-SHA256).
     * See: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
     */
    validateWebhookSignature(xSignature: string, xRequestId: string, dataId: string): boolean {
        if (!this.webhookSecret) {
            this.logger.warn('MP_WEBHOOK_SECRET not configured — skipping HMAC validation');
            return true; // En dev, si no hay secreto, permitir
        }

        if (!xSignature || !xRequestId) {
            this.logger.warn('Missing x-signature or x-request-id headers');
            return false;
        }

        // Parse x-signature header: "ts=...,v1=..."
        const parts: Record<string, string> = {};
        xSignature.split(',').forEach(part => {
            const [key, ...valueParts] = part.trim().split('=');
            parts[key] = valueParts.join('=');
        });

        const ts = parts['ts'];
        const v1 = parts['v1'];

        if (!ts || !v1) {
            this.logger.warn('Invalid x-signature format');
            return false;
        }

        // Build the manifest string as MP specifies
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const hmac = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(manifest)
            .digest('hex');

        return hmac === v1;
    }

    async createTopupPreference(params: {
        accessToken: string;
        transactionId: number;
        childName: string;
        amountCents: number;
        backUrls?: { success: string, pending: string, failure: string };
        notificationUrl?: string;
    }) {
        const client = this.getClient(params.accessToken);
        const preference = new Preference(client);

        try {
            const result = await preference.create({
                body: {
                    items: [
                        {
                            id: params.transactionId.toString(),
                            title: `Recarga KioEdu: ${params.childName}`,
                            unit_price: params.amountCents / 100,
                            quantity: 1,
                            currency_id: 'ARS',
                        },
                    ],
                    external_reference: params.transactionId.toString(),
                    notification_url: params.notificationUrl,
                    back_urls: params.backUrls,
                    auto_return: 'approved',
                    payment_methods: {
                        excluded_payment_types: [
                            { id: 'ticket' }
                        ],
                        installments: 1,
                    },
                },
            });

            return {
                id: result.id,
                init_point: result.init_point,
                sandbox_init_point: result.sandbox_init_point,
            };
        } catch (error) {
            this.logger.error(`Error al crear preferencia de Mercado Pago: ${error.message}`);
            throw error;
        }
    }

    async getPayment(paymentId: string, accessToken: string) {
        const client = this.getClient(accessToken);
        const payment = new Payment(client);
        try {
            return await payment.get({ id: paymentId });
        } catch (error) {
            this.logger.error(`Error al consultar pago MP ${paymentId}: ${error.message}`);
            throw error;
        }
    }
}
