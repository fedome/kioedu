import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountsModule } from '../accounts/accounts.module';
import { JwtModule } from '@nestjs/jwt'; // <-- AÚN LO NECESITA para firmar tokens
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { KioskThrottlerGuard } from './rate-limit/kiosk-throttler.guard';
import { LimitsModule } from '../limits/limits.module';
// --- IMPORTAMOS AUTHMODULE ---
import { AuthModule } from '../auth/auth.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { ArcaModule } from '../arca/arca.module';

@Module({
  imports: [
    PrismaModule,
    AccountsModule,
    // JwtModule es necesario para que PosService pueda *firmar* tokens
    JwtModule.register({}),
    LimitsModule,
    AuthModule, // <-- AÑADIDO (para tener Passport y los guardianes)
    PurchaseOrdersModule,
    NotificationsModule,
    MercadoPagoModule,
    ArcaModule,
  ],
  controllers: [PosController],
  providers: [
    PosService,
  ],
  // Ya no necesitamos exportar nada
  exports: [],
})
export class PosModule { }