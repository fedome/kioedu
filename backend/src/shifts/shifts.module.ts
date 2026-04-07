import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { PrismaModule } from '../prisma/prisma.module';
// --- IMPORTAMOS AUTHMODULE ---
import { AuthModule } from '../auth/auth.module';
// (Quitamos PosModule de imports, AuthModule ya provee todo)

@Module({
  imports: [
    PrismaModule,
    AuthModule, // <-- AÑADIDO (para tener Passport y los guardianes)
  ],
  providers: [ShiftsService],
  controllers: [ShiftsController],
})
export class ShiftsModule {}