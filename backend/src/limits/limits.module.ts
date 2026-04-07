import { Module } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { LimitsController } from './limits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LimitsService],
  controllers: [LimitsController],
  exports: [LimitsService],
})
export class LimitsModule {}
