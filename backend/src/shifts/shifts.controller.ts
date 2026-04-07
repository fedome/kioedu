import { Body, Controller, Get, Query, UseGuards, Req, Post, ParseIntPipe } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CashierJwtGuard } from '../pos/cashier-jwt.guard';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiUnauthorizedResponse,
    ApiBadRequestResponse, ApiCreatedResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { ApiCommonErrors } from '../common/swagger.decorators';

@ApiTags('Cash Sessions (V2)') // Renombrado
@ApiBearerAuth('JWT')
@UseGuards(CashierJwtGuard, RolesGuard)
@Roles(Role.CASHIER, Role.ADMIN)
@Controller('cash-sessions') // Ruta renombrada
export class ShiftsController {
    constructor(private shifts: ShiftsService) { }

    @Post('open')
    @ApiOperation({ summary: 'V2: Abre una nueva sesión de caja (CashSession)' })
    // --- INICIO: DOCUMENTACIÓN DE RESPUESTAS ---

    @ApiCreatedResponse({
        description: 'Sesión de caja abierta exitosamente. Devuelve el objeto CashSession.'
    })

    @ApiBadRequestResponse({
        description: 'Bad Request. La terminal ya tiene una sesión de caja abierta.'
    })

    @ApiUnauthorizedResponse({
        description: 'Unauthorized. El cashier_token es inválido o ha expirado.'
    })

    @ApiForbiddenResponse({
        description: 'Forbidden. El rol del token no es CASHIER o ADMIN.'
    })

    @ApiCommonErrors() // (Tu decorador personalizado para otros errores, si lo tienes)
    // --- FIN: DOCUMENTACIÓN DE RESPUESTAS ---
    open(@Body() dto: OpenShiftDto, @Req() req: any) {
        const { kioskId: terminalId, userId: cashierId } = req.user;
        return this.shifts.openCashSession(terminalId, cashierId, dto);
    }

    @Post('close')
    @ApiOperation({ summary: 'V2: Cierra la sesión de caja actual' })
    @ApiCommonErrors()
    close(@Body() dto: CloseShiftDto, @Req() req: any) {
        const { kioskId: terminalId, userId: closedByUserId } = req.user;
        return this.shifts.closeCashSession(terminalId, closedByUserId, dto);
    }

    @Post('cash-movement')
    @ApiOperation({ summary: 'V2: Agrega movimiento de caja a la sesión actual' })
    @ApiCommonErrors()
    cashMovement(@Body() body: { kind: 'IN' | 'OUT' | 'ADJUST' | 'DROP'; amount: number; note?: string }, @Req() req: any) {
        const { kioskId: terminalId } = req.user;
        return this.shifts.addCashMovement(terminalId, body.kind, body.amount, body.note);
    }

    @Get('summary')
    @ApiOperation({ summary: 'V2: Resumen de la sesión de caja actual' })
    @ApiCommonErrors()
    summary(@Req() req: any, @Query('lastClosed') lastClosed?: string) {
        const { kioskId: terminalId } = req.user;
        return this.shifts.getCashSessionSummary(terminalId, lastClosed === 'true');
    }

    @Get()
    @Roles(Role.ADMIN, Role.ENCARGADO, Role.CASHIER)
    @ApiOperation({ summary: 'V2: Listar sesiones de caja (Admin)' })
    findAll(@Query('limit', ParseIntPipe) limit?: number) {
        return this.shifts.findAll(limit);
    }
}