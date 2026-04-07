import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { PosModule } from './pos/pos.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LimitsModule } from './limits/limits.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'; // <-- Quitamos APP_GUARD y Reflector
import { ReportsModule } from './reports/reports.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ProductsModule } from './products/products.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ChildrenModule } from './children/children.module';
import { AuditModule } from './audit/audit.module';
import { ArcaModule } from './arca/arca.module';
import { AiModule } from './ai/ai.module';
import { SchoolsModule } from './schools/schools.module';
import { AdminModule } from './admin/admin.module';
import { TicketsModule } from './tickets/tickets.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minuto
        limit: 60,  // 60 peticiones por minuto (límite global)
      },
    ]),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    PosModule,
    LimitsModule,
    ReportsModule,
    ShiftsModule,
    ProductsModule,
    PurchaseOrdersModule,
    PaymentsModule,
    NotificationsModule,
    SuppliersModule,
    ChildrenModule,
    CategoriesModule,
    AuditModule,
    ArcaModule,
    AiModule,
    SchoolsModule,
    AdminModule,
    TicketsModule,
    WebhooksModule,
  ],
  providers: [
    // --- SOLO DEJAMOS EL INTERCEPTOR ---
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // --- QUITAMOS AMBOS APP_GUARD DE RolesGuard ---
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule { }