import { Body, Controller, Get, Param, Post, Req, UseGuards, Headers, ParseIntPipe, Query, BadRequestException } from '@nestjs/common';
import { PosService } from './pos.service';
import { CashierJwtGuard } from '../pos/cashier-jwt.guard';
import { KioskApiKeyGuard } from '../pos/kiosk-api-key.guard';
import { KioskJwtGuard } from '../pos/kiosk-jwt.guard';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.enum';
import { Roles } from '../auth/roles.decorator';
import { ApiCommonErrors, ApiKioskApiKeyHeader, ApiJWT } from '../common/swagger.decorators';
import { CashierLoginDto } from './dto/cashier-login.dto';
import { AddItemDto } from './dto/add-item.dto';
import { PayDto } from './dto/pay.dto';
import { VoidDto } from './dto/void.dto';
import { Throttle } from '@nestjs/throttler';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreditByCardDto } from './dto/credit-by-card.dto';
import { ChargeBalanceDto } from './dto/charge-balance.dto';

@ApiTags('POS (V2 Híbrido)')
@Controller('pos')
export class PosController {
    constructor(private pos: PosService) { }

    // ===================================================================
    // LÓGICA DE LOGIN V1 (LA CONSERVAMOS)
    // ===================================================================

    @Post('session/login')
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 intentos por minuto por IP
    @UseGuards(KioskApiKeyGuard)
    @ApiOperation({ summary: 'V1: Login de kiosco con API Key → JWT' })
    @ApiKioskApiKeyHeader()
    @ApiOkResponse({ description: 'kiosk_token, kioskId, schoolId, expiresAt' })
    @ApiCommonErrors()
    async kioskLogin(@Req() req: any) {
        return this.pos.issueKioskToken(req.kiosk);
    }

    @Post('session/logout')
    @UseGuards(KioskJwtGuard)
    @ApiOperation({ summary: 'V1: Logout (revoca token actual del kiosco)' })
    @ApiJWT()
    @ApiOkResponse({ schema: { example: { ok: true } } })
    @ApiCommonErrors()
    async kioskLogout(@Req() req: any) {
        await this.pos.revokeCurrentSession(req.user.jti!, req.user.kioskId);
        return { ok: true };
    }

    @Post('cashier/login')
    @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 intentos por minuto
    @UseGuards(KioskJwtGuard)
    @ApiOperation({ summary: 'V1: Login de cajero en kiosco autenticado' })
    @ApiJWT()
    @ApiBody({ type: CashierLoginDto })
    @ApiOkResponse({ description: 'cashier_token + metadatos (kioskId, userId, schoolId, expiresAt)' })
    @ApiCommonErrors()
    async cashierLogin(@Body() body: CashierLoginDto, @Req() req: any) {
        return this.pos.cashierLogin(req.user.kioskId, body.email, body.password);
    }

    // ===================================================================
    // VENTA V2 (FLUJO DE CARRITO)
    // ===================================================================

    @Post('transactions')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'V2: Procesar venta completa (Bulk)', description: 'Recibe ítems, descuenta stock FIFO y registra venta.' })
    @ApiBody({ type: CreateTransactionDto })
    @ApiOkResponse({ description: 'La transacción procesada y pagada.' })
    @ApiCommonErrors()
    async createTransactionV2(
        @Req() req: any,
        @Body() dto: CreateTransactionDto
    ) {
        const { userId, kioskId, ownerId } = req.user;
        // Llamamos al nuevo método del servicio para procesar todo junto
        return this.pos.processBulkTransaction(userId, kioskId, ownerId, dto);
    }


    @Post('transactions/:id/items')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'V2: Agrega un ítem al carrito (transacción PENDING)' })
    @ApiOkResponse({ description: 'La transacción actualizada con el nuevo total.' })
    @ApiCommonErrors()
    async addTransactionItem(
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: AddItemDto,
        @Req() req: any,
    ) {
        const { kioskId: terminalId, role } = req.user; // <-- Obtenemos el ROL

        // Pasamos el rol al servicio
        return this.pos.addTransactionItem(transactionId, dto, terminalId, role);
    }

    @Post('transactions/:id/pay')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'V2: Confirma el pago, descuenta stock y marca la Tx como PAID' })
    @ApiOkResponse({ description: 'La transacción pagada.' })
    @ApiCommonErrors()
    async payForTransaction(
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: PayDto,
        @Req() req: any,
    ) {
        const { userId: cashierId, kioskId: terminalId } = req.user;
        return this.pos.payForTransaction(transactionId, dto, cashierId, terminalId);
    }

    @Post('transactions/:id/void')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.ENCARGADO) // Solo roles de supervisión
    @ApiOperation({ summary: 'V2: Anula una transacción PAID (revierte stock y caja)' })
    @ApiOkResponse({ description: 'La transacción anulada (estado VOID).' })
    @ApiCommonErrors()
    async voidTransaction(
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: VoidDto,
        @Req() req: any,
    ) {
        const { userId: cashierId, kioskId: terminalId, role } = req.user;
        return this.pos.voidTransaction(transactionId, dto, role, cashierId, terminalId);
    }

    @Get('transactions/:id')
    @UseGuards(CashierJwtGuard)
    async getTransaction(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.pos.getTransactionDetails(id);
    }

    @Get('students/search') // Ruta: /api/pos/students/search?q=...
    @UseGuards(CashierJwtGuard)
    @ApiOperation({ summary: 'Buscar alumnos por Nombre, DNI o Tarjeta NFC' })
    searchStudent(@Query('q') query: string, @Req() req: any) {
        if (!query || query.length < 3) {
            throw new BadRequestException('La búsqueda debe tener al menos 3 caracteres.');
        }
        return this.pos.searchStudent(query, req.user.ownerId);
    }


    @Get('students') // Ruta: /api/pos/students
    @UseGuards(CashierJwtGuard)
    @ApiOperation({ summary: 'Obtener TODOS los alumnos (para Sync Offline)' })
    getAllStudents(@Req() req: any, @Query('lastSync') lastSync?: string) {
        return this.pos.getAllStudents(lastSync, req.user.ownerId);
    }


    @Get('students/:id')
    @UseGuards(CashierJwtGuard)
    @ApiOperation({ summary: 'Obtener un alumno por ID' })
    getStudent(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.pos.getStudent(id, req.user.ownerId);
    }


    @Get('students/:id/transactions')
    @UseGuards(CashierJwtGuard)
    @ApiOperation({ summary: 'Obtener historial de transacciones de un alumno' })
    getStudentTransactions(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.pos.getStudentTransactions(id, req.user.ownerId);
    }


    @Post('credit')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'Cargar saldo presencial (Efectivo)' })
    async chargeBalance(@Body() dto: ChargeBalanceDto, @Req() req: any) {
        const { userId, kioskId, ownerId } = req.user;
        return this.pos.chargeBalance(dto, userId, kioskId, ownerId);
    }


    @Post('students/:id/payment')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'Registrar un pago/carga de saldo para un alumno específico' })
    async registerStudentPayment(
        @Param('id', ParseIntPipe) childId: number,
        @Body() body: { amountCents: number; method: 'CASH' | 'TRANSFER' },
        @Req() req: any,
    ) {
        const { userId, kioskId, ownerId } = req.user;
        const dto: ChargeBalanceDto = { childId, amountCents: body.amountCents };
        return this.pos.chargeBalance(dto, userId, kioskId, ownerId);
    }

    @Get('pending-topups')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'V2: Obtener solicitudes de recarga en efectivo pendientes' })
    async getPendingTopups(@Req() req: any) {
        return this.pos.getPendingTopups(req.user.ownerId);
    }

    @Post('pending-topups/:id/approve')
    @UseGuards(CashierJwtGuard, RolesGuard)
    @Roles(Role.CASHIER, Role.ADMIN, Role.ENCARGADO)
    @ApiOperation({ summary: 'V2: Aprobar una recarga en efectivo y acreditar saldo' })
    async approveTopup(
        @Param('id', ParseIntPipe) transactionId: number,
        @Req() req: any,
    ) {
        const { userId, kioskId, ownerId } = req.user;
        return this.pos.approveTopup(transactionId, userId, kioskId, ownerId);
    }
}