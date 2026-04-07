// src/pos/cashier-jwt.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CashierJwtGuard extends AuthGuard('cashier-jwt') {}
