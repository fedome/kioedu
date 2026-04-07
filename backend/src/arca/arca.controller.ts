import { Body, Controller, Get, Post, Put, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ArcaService } from './arca.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { UpdateInvoicingConfigDto } from './dto/update-invoicing-config.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RetryInvoiceDto } from './dto/retry-invoice.dto';
import { EmailInvoiceDto } from './dto/email-invoice.dto';

@ApiTags('Invoicing (ARCA)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('invoicing')
export class ArcaController {
    constructor(private arcaService: ArcaService) { }

    @Get('config')
    @ApiOperation({ summary: 'Get invoicing config for a school' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    getConfig(@Query('schoolId', ParseIntPipe) schoolId: number) {
        return this.arcaService.getConfig(schoolId);
    }

    @Put('config')
    @ApiOperation({ summary: 'Update invoicing config for a school' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    updateConfig(
        @Query('schoolId', ParseIntPipe) schoolId: number,
        @Body() dto: UpdateInvoicingConfigDto,
    ) {
        return this.arcaService.updateConfig(schoolId, dto);
    }

    @Get('status')
    @ApiOperation({ summary: 'Check ARCA web service status' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    checkStatus(@Query('schoolId', ParseIntPipe) schoolId: number) {
        return this.arcaService.checkStatus(schoolId);
    }

    @Get('last')
    @ApiOperation({ summary: 'Get last authorized invoice number' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    getLastInvoice(@Query('schoolId', ParseIntPipe) schoolId: number) {
        return this.arcaService.getLastInvoice(schoolId);
    }

    @Post('invoice')
    @ApiOperation({ summary: 'Create an invoice for a transaction (manual)' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    createInvoice(
        @Query('schoolId', ParseIntPipe) schoolId: number,
        @Body() dto: CreateInvoiceDto,
    ) {
        return this.arcaService.createInvoice(schoolId, dto.transactionId, dto.docType, dto.docNumber);
    }

    @Post('invoice/retry')
    @ApiOperation({ summary: 'Retry invoicing for a failed transaction' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    retryInvoice(
        @Query('schoolId', ParseIntPipe) schoolId: number,
        @Body() dto: RetryInvoiceDto,
    ) {
        return this.arcaService.createInvoice(schoolId, dto.transactionId);
    }

    @Get('invoice/pdf')
    @ApiOperation({ summary: 'Generate and download invoice PDF' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    @ApiQuery({ name: 'transactionId', type: Number, required: true })
    getInvoicePdf(
        @Query('schoolId', ParseIntPipe) schoolId: number,
        @Query('transactionId', ParseIntPipe) transactionId: number,
    ) {
        return this.arcaService.generateInvoicePdf(schoolId, transactionId);
    }

    @Post('invoice/email')
    @ApiOperation({ summary: 'Email invoice PDF to recipient' })
    @ApiQuery({ name: 'schoolId', type: Number, required: true })
    emailInvoice(
        @Query('schoolId', ParseIntPipe) schoolId: number,
        @Body() dto: EmailInvoiceDto,
    ) {
        return this.arcaService.emailInvoice(schoolId, dto.transactionId, dto.recipientEmail);
    }
}
