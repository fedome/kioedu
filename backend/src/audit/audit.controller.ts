import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CashierJwtGuard } from '../pos/cashier-jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Audit (Control Gerencial)')
@ApiBearerAuth('JWT')
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('feed')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'Feed de eventos sensibles para el administrador' })
    getFeed(@Query('limit') limit?: number) {
        return this.auditService.getAuditFeed(limit ? Number(limit) : 50);
    }
}
