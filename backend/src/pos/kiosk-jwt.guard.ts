import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KioskJwtGuard extends AuthGuard('kiosk-jwt') {}
// The KioskJwtGuard uses the 'kiosk-jwt' strategy defined in KioskJwtStrategy to protect routes that require kiosk authentication.