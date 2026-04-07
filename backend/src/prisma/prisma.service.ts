import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // ✅ Alternativa estable sin $on('beforeExit')
    async enableShutdownHooks(app: INestApplication) {
        const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        for (const sig of signals) {
            process.on(sig, async () => {
                await app.close();
            });
        }
    }
}
