import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference, OAuth } from 'mercadopago';
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
            this.logger.log(`Creando preferencia con: ${JSON.stringify({
                transactionId: params.transactionId,
                amount: params.amountCents / 100,
                backUrls: params.backUrls,
                notificationUrl: params.notificationUrl
            })}`);

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
                    back_urls: {
                        success: params.backUrls?.success,
                        failure: params.backUrls?.failure,
                        pending: params.backUrls?.pending,
                    },
                    // auto_return: 'approved',
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

    getAuthUrl() {
        const clientId = this.configService.get<string>('MP_CLIENT_ID');
        const redirectUri = this.configService.get<string>('FRONTEND_URL') + '/settings';
        
        // Mercado Pago OAuth URL - Versión completa recomendada
        return `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=kio_${Math.random().toString(36).substring(7)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    async exchangeCodeForToken(code: string) {
        const clientId = this.configService.get<string>('MP_CLIENT_ID');
        const clientSecret = this.configService.get<string>('MP_CLIENT_SECRET');
        const redirectUri = this.configService.get<string>('FRONTEND_URL') + '/settings';

        const client = new MercadoPagoConfig({ accessToken: 'NOT_NEEDED_YET' }); // OAuth create don't strictly need it in body but the SDK might require it in config or as a clean client
        const oauth = new OAuth(client);

        try {
            const result = await (oauth as any).create({
                body: {
                    client_id: clientId as string,
                    client_secret: clientSecret as string,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri,
                }
            });

            return {
                accessToken: result.access_token,
                publicKey: result.public_key,
                refreshToken: result.refresh_token,
                userId: result.user_id,
            };
        } catch (error) {
            this.logger.error(`Error al intercambiar código OAuth: ${error.message}`);
            throw error;
        }
    }
}
