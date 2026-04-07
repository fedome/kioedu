import {Controller, Get} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {ApiOkResponse, ApiOperation, ApiTags} from "@nestjs/swagger";


class HealthResponse {
    status: 'ok';
}

@ApiTags('Health')
@Controller('health')

export class HealthController {
    constructor(private prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: 'Estado del servicio' })
    @ApiOkResponse({ description: 'Servicio operativo', type: HealthResponse })
    get() {
        return { status: 'ok' as const };
    }
    /*async check() {
        // Ping a la DB
        await this.prisma.$queryRaw`SELECT 1`;
        return { status: 'ok', db: 'up', timestamp: new Date().toISOString() };
    }*/
}
