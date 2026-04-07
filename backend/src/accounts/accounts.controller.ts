
import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalanceResponseDto } from './dto/balance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AccountsService } from './accounts.service';
import { Role } from '../auth/roles.enum';
import { ApiCommonErrors } from '../common/swagger.decorators';
import { AccountMovementDto } from './dto/account-movement.dto';

@ApiTags('Accounts (Padres)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
    constructor(private accounts: AccountsService) { }

    @Get(':childId/balance')
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiOperation({ summary: 'Ver saldo actual del alumno' })
    @ApiCommonErrors()
    getBalance(@Param('childId', ParseIntPipe) childId: number, @Req() req: any) {
        return this.accounts.getBalance(childId, req.user.sub, req.user.roles);
    }

    @Get(':childId/statement')
    @Roles(Role.ADMIN, Role.PARENT)
    @ApiOperation({ summary: 'Ver últimos movimientos (Extracto)' })
    @ApiOkResponse({ type: AccountMovementDto, isArray: true })
    getStatement(
        @Param('childId', ParseIntPipe) childId: number,
        @Req() req: any,
        @Query('limit') limit?: string,
    ) {
        const parsed = limit ? parseInt(limit, 10) : 20;
        const take = Number.isNaN(parsed) ? 20 : Math.min(parsed, 100);
        return this.accounts.getStatement(childId, take, req.user.sub, req.user.roles);
    }
}
