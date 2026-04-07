import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // así no tenés que importar este módulo en todos lados
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
