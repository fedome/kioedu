import { Module } from '@nestjs/common';
import { ArcaService } from './arca.service';
import { ArcaController } from './arca.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ArcaController],
    providers: [ArcaService],
    exports: [ArcaService],
})
export class ArcaModule { }
