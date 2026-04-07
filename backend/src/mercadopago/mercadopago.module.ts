import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { ConfigModule } from '@nestjs/config';
import { MercadoPagoController } from './mercadopago.controller';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ConfigModule, PaymentsModule, AuthModule],
    controllers: [MercadoPagoController],
    providers: [MercadoPagoService],
    exports: [MercadoPagoService],
})
export class MercadoPagoModule { }
