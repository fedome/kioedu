import { Module } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { ChildrenController } from './children.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [ChildrenController],
    providers: [ChildrenService, PrismaService],
})
export class ChildrenModule { }
