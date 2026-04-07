import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // Importamos AuthModule

@Module({
  imports: [PrismaModule, AuthModule], // AuthModule provee los guardianes
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
