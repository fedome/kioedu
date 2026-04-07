import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';

// --- IMPORTAMOS TODAS LAS ESTRATEGIAS Y GUARDIANES ---
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { KioskApiKeyGuard } from '../pos/kiosk-api-key.guard';
import { KioskJwtStrategy } from '../pos/kiosk-jwt.strategy';
import { KioskJwtGuard } from '../pos/kiosk-jwt.guard';
import { CashierJwtStrategy } from '../pos/cashier-jwt.strategy';
import { CashierJwtGuard } from '../pos/cashier-jwt.guard';
import { JWT_EXPIRES_IN } from './constants';

@Module({
  imports: [
    UsersModule,
    PrismaModule, // <-- AÑADIDO (necesario para las estrategias)
    // 1. Registramos Passport AQUÍ (y solo aquí)
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController, RolesController],
  providers: [
    AuthService,
    RolesService,
    // --- PROVEEMOS TODO AQUÍ ---
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    KioskApiKeyGuard,
    KioskJwtStrategy,
    KioskJwtGuard,
    CashierJwtStrategy,
    CashierJwtGuard,
  ],
  // --- EXPORTAMOS TODO LO QUE OTROS MÓDULOS NECESITAN ---
  exports: [
    AuthService,
    RolesService,
    PassportModule,
    JwtAuthGuard,
    RolesGuard,
    KioskApiKeyGuard,
    KioskJwtGuard,
    CashierJwtGuard,
  ],
})
export class AuthModule { }