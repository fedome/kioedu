import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AfipServices } from 'facturajs';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { format, parse } from 'date-fns';

@Injectable()
export class ArcaService {
    private readonly logger = new Logger(ArcaService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Build a FacturaJS AfipServices instance for a specific school.
     */
    private async getAfipInstance(schoolId: number): Promise<AfipServices> {
        const config = await this.prisma.invoicingConfig.findUnique({
            where: { schoolId },
        });

        if (!config) {
            throw new NotFoundException(`No invoicing config found for school ${schoolId}`);
        }

        if (!config.isEnabled) {
            throw new BadRequestException('Invoicing is disabled for this school');
        }

        const isProduction = config.environment === 'production';

        if (!config.certContent || !config.keyContent) {
            throw new BadRequestException('Certificado (.crt) o Llave (.key) no configurados en formato texto');
        }

        const tokenDir = path.join(process.cwd(), '.afip-tokens', `school-${schoolId}`);
        // Ensure token cache directory exists
        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        const afipOptions: any = {
            certContents: config.certContent,
            privateKeyContents: config.keyContent,
            cacheTokensPath: tokenDir,
            homo: !isProduction,
        };

        return new AfipServices(afipOptions);
    }

    /**
     * Get the invoicing config for a school.
     */
    async getConfig(schoolId: number) {
        const config = await this.prisma.invoicingConfig.findUnique({
            where: { schoolId },
        });

        if (!config) {
            return {
                isEnabled: false,
                cuit: null,
                fiscalCondition: 'MONOTRIBUTO',
                invoiceType: 11,
                salePoint: null,
                autoInvoice: false,
                minAmountCents: 0,
                environment: 'testing',
            };
        }

        const { certContent, keyContent, ...safeConfig } = config;
        return {
            ...safeConfig,
            certContent,
            keyContent: keyContent ? '*** Oculto por seguridad ***' : null,
        };
    }

    /**
     * Update or create the invoicing config for a school.
     */
    async updateConfig(schoolId: number, data: any) {
        const allowedFields = [
            'isEnabled', 'cuit', 'fiscalCondition', 'invoiceType',
            'salePoint', 'certContent', 'keyContent',
            'autoInvoice', 'minAmountCents', 'environment',
            'pdfSavePath', 'businessName', 'businessAddress',
            'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'emailSubject',
            'businessLogo'
        ];
        const filtered: any = {};
        for (const key of allowedFields) {
            if (key in data) {
                if (key === 'keyContent' && data[key] === '*** Oculto por seguridad ***') continue;
                filtered[key] = data[key];
            }
        }

        return this.prisma.invoicingConfig.upsert({
            where: { schoolId },
            update: filtered,
            create: {
                schoolId,
                ...filtered,
            },
        });
    }

    /**
     * Check if ARCA web service is available.
     */
    async checkStatus(schoolId: number) {
        try {
            const config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
            if (!config?.cuit) throw new Error('CUIT no configurado');

            const afip = await this.getAfipInstance(schoolId);
            const res = await afip.execRemote('wsfev1', 'FEDummy', {});
            return {
                available: true,
                appServer: res.AppServer,
                dbServer: res.DbServer,
                authServer: res.AuthServer,
            };
        } catch (error: any) {
            this.logger.error('ARCA status check failed', error.message);
            return {
                available: false,
                error: error.message,
            };
        }
    }

    /**
     * Get the last authorized invoice number.
     */
    async getLastInvoice(schoolId: number) {
        const config = await this.prisma.invoicingConfig.findUnique({
            where: { schoolId },
        });

        if (!config || !config.salePoint || !config.invoiceType || !config.cuit) {
            throw new BadRequestException('Invoicing config incomplete (missing salePoint, invoiceType or cuit)');
        }

        const afip = await this.getAfipInstance(schoolId);
        const res = await afip.getLastBillNumber({
            Auth: { Cuit: parseInt(config.cuit.replace(/[-\s]/g, ''), 10) },
            params: {
                CbteTipo: config.invoiceType,
                PtoVta: config.salePoint,
            },
        });

        return {
            lastNumber: res.CbteNro,
            salePoint: config.salePoint,
            invoiceType: config.invoiceType,
        };
    }

    /**
     * Create an invoice for a transaction.
     */
    async createInvoice(schoolId: number, transactionId: number, docType?: number, docNumber?: string) {
        let config;
        let transaction;
        try {
            config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
            if (!config || !config.isEnabled) throw new BadRequestException('Facturación no habilitada');
            if (!config.salePoint || !config.cuit) throw new BadRequestException('Configuración de facturación incompleta');

            transaction = await this.prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { items: true },
            });
            if (!transaction) throw new NotFoundException(`Transacción ${transactionId} no encontrada`);

            if (transaction.invoiceCae) {
                this.logger.log(`Transaction ${transactionId} already invoiced (CAE: ${transaction.invoiceCae})`);
                return {
                    invoiceNumber: transaction.invoiceNumber,
                    cae: transaction.invoiceCae,
                    caeExpiry: transaction.invoiceCaeExpiry?.toISOString().split('T')[0] || '',
                    invoiceType: transaction.invoiceType,
                    salePoint: config.salePoint,
                    total: transaction.totalCents / 100,
                };
            }

            const cuitNumber = parseInt(config.cuit.replace(/[-\s]/g, ''), 10);
            const afip = await this.getAfipInstance(schoolId);
            const lastRes = await afip.getLastBillNumber({
                Auth: { Cuit: cuitNumber },
                params: {
                    CbteTipo: config.invoiceType,
                    PtoVta: config.salePoint,
                },
            });
            const nextNumber = lastRes.CbteNro + 1;

            const today = new Date();
            const totalPesos = transaction.totalCents / 100;

            const feDetReq: any = {
                DocTipo: docType ?? 99,
                DocNro: docNumber ? parseInt(docNumber.replace(/-/g, ''), 10) : 0,
                Concepto: 1,
                CbteDesde: nextNumber,
                CbteHasta: nextNumber,
                CbteFch: format(today, 'yyyyMMdd'),
                ImpTotal: totalPesos,
                ImpTotConc: 0,
                ImpNeto: totalPesos,
                ImpOpEx: 0,
                ImpIVA: 0,
                ImpTrib: 0,
                MonId: 'PES',
                MonCotiz: 1,
            };

            if (config.invoiceType === 6 && config.fiscalCondition === 'RESP_INSCRIPTO') {
                const neto = parseFloat((totalPesos / 1.21).toFixed(2));
                const iva = parseFloat((totalPesos - neto).toFixed(2));
                feDetReq.ImpNeto = neto;
                feDetReq.ImpIVA = iva;
                feDetReq.Iva = [{ AlicIva: { Id: 5, BaseImp: neto, Importe: iva } }];
            }

            this.logger.log(`Creating invoice #${nextNumber} for transaction ${transactionId}`);

            const result = await afip.createBill({
                Auth: { Cuit: cuitNumber },
                params: {
                    FeCAEReq: {
                        FeCabReq: { CantReg: 1, PtoVta: config.salePoint, CbteTipo: config.invoiceType },
                        FeDetReq: { FECAEDetRequest: feDetReq },
                    },
                },
            });

            const detail = result.FeDetResp.FECAEDetResponse[0];
            if (detail.Resultado !== 'A') {
                throw new Error(detail.Observaciones?.Obs?.[0]?.Msg || 'Error desconocido de ARCA');
            }

            const cae = detail.CAE;
            const caeExpiryDate = parse(detail.CAEFchVto, 'yyyyMMdd', new Date());

            await this.prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    invoiceNumber: nextNumber,
                    invoiceCae: cae,
                    invoiceCaeExpiry: caeExpiryDate,
                    invoiceType: config.invoiceType,
                    invoiceDate: today,
                    clientDocType: docType ? String(docType) : transaction.clientDocType,
                    clientDocNumber: docNumber || transaction.clientDocNumber,
                    invoiceError: null,
                },
            });

            await this.prisma.invoicingConfig.update({
                where: { schoolId },
                data: { lastError: null },
            });

            this.logger.log(`✅ Invoice #${nextNumber} created - CAE: ${cae}`);

            if (config.pdfSavePath) {
                try { await this.generateAndSavePdf(schoolId, transactionId); } catch (e) { }
            }

            if (config.emailSubject && config.smtpHost && config.smtpUser && config.smtpPass) {
                try { await this.emailInvoice(schoolId, transactionId, config.emailSubject); } catch (e) { }
            }

            return {
                invoiceNumber: nextNumber,
                cae,
                caeExpiry: caeExpiryDate.toISOString(),
                invoiceType: config.invoiceType,
                salePoint: config.salePoint,
                total: totalPesos,
            };
        } catch (error: any) {
            const errMsg = error.message || 'Error desconocido';
            this.logger.error(`❌ Invoicing failed: ${errMsg}`);

            await this.prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    invoiceError: errMsg,
                    clientDocType: docType ? String(docType) : transaction?.clientDocType,
                    clientDocNumber: docNumber || transaction?.clientDocNumber,
                },
            }).catch(() => { });

            if (config) {
                await this.prisma.invoicingConfig.update({
                    where: { schoolId },
                    data: { lastError: errMsg },
                }).catch(() => { });
            }

            throw new BadRequestException(`Error de facturación: ${errMsg}`);
        }
    }

    /**
     * Auto-invoice a transaction if conditions are met.
     */
    async autoInvoiceIfEnabled(schoolId: number, transactionId: number, totalCents: number): Promise<void> {
        try {
            const config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
            if (!config || !config.isEnabled || !config.autoInvoice) return;
            if (totalCents < config.minAmountCents) return;

            await this.createInvoice(schoolId, transactionId);
            this.logger.log(`✅ Auto-invoiced transaction ${transactionId}`);
        } catch (error: any) {
            this.logger.error(`❌ Auto-invoice failed for transaction ${transactionId}: ${error.message}`);
        }
    }

    /**
     * Generate invoice PDF using pdfkit with official Argentine ARCA format.
     */
    async generateInvoicePdf(schoolId: number, transactionId: number): Promise<{ file: string; fileName: string }> {
        const config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
        if (!config) throw new NotFoundException('No invoicing config found');

        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { items: { include: { product: { select: { name: true, sku: true } } } } },
        });
        if (!transaction || !transaction.invoiceCae) throw new BadRequestException('Transaction not found or not invoiced');

        const totalPesos = transaction.totalCents / 100;
        const invoiceDate = format(new Date(transaction.invoiceDate || transaction.startedAt), 'dd/MM/yyyy');
        const caeExpiry = format(new Date(transaction.invoiceCaeExpiry!), 'dd/MM/yyyy');

        const invoiceTypeCode = transaction.invoiceType || config.invoiceType || 11;
        const invoiceTypeName = invoiceTypeCode === 11 ? 'C' : invoiceTypeCode === 6 ? 'B' : invoiceTypeCode === 1 ? 'A' : 'X';
        const invoiceTypeCodeStr = String(invoiceTypeCode).padStart(3, '0');

        const businessName = config.businessName || 'Kiosco Escolar';
        const businessAddr = config.businessAddress || '';
        const salePointStr = String(config.salePoint).padStart(5, '0');
        const invoiceNumStr = String(transaction.invoiceNumber).padStart(8, '0');
        const fileName = `Factura_${invoiceTypeName}_${salePointStr}-${invoiceNumStr}`;

        const condIva = config.fiscalCondition === 'RESP_INSCRIPTO' ? 'Responsable Inscripto'
            : config.fiscalCondition === 'MONOTRIBUTO' ? 'Responsable Monotributo'
                : config.fiscalCondition === 'EXENTO' ? 'IVA Exento' : 'Consumidor Final';

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 25 });
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve());
            doc.on('error', (err: Error) => reject(err));

            const pw = doc.page.width;
            const leftM = 25;
            const rightM = pw - 25;
            const contentW = rightM - leftM;
            const midX = pw / 2;

            const bwipjs = require('bwip-js');
            const qrData = {
                ver: 1,
                fecha: format(new Date(transaction.invoiceDate || transaction.startedAt), 'yyyy-MM-dd'),
                cuit: parseInt(config.cuit?.replace(/[-\s]/g, '') || '0', 10),
                ptoVta: config.salePoint,
                tipoCmp: invoiceTypeCode,
                nroCmp: transaction.invoiceNumber,
                importe: totalPesos,
                moneda: 'PES',
                ctz: 1,
                tipoDocRec: parseInt(transaction.clientDocType || '99', 10),
                nroDocRec: parseInt(transaction.clientDocNumber || '0', 10),
                tipoCodAut: 'E',
                codAut: parseInt(transaction.invoiceCae || '0', 10),
            };
            const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;

            (async () => {
                try {
                    const qrBuffer = await bwipjs.toBuffer({ bcid: 'qrcode', text: qrUrl, scale: 2, height: 30, width: 30 });

                    // Header
                    doc.rect(leftM, 25, contentW, 110).lineWidth(1).strokeColor('#000').stroke();
                    doc.fontSize(10).font('Helvetica-Bold').text('ORIGINAL', leftM, 15, { width: contentW, align: 'center' });

                    const boxSize = 45;
                    doc.rect(midX - boxSize / 2, 25, boxSize, boxSize).lineWidth(1).stroke();
                    doc.fontSize(30).font('Helvetica-Bold').text(invoiceTypeName, midX - boxSize / 2, 32, { width: boxSize, align: 'center' });
                    doc.fontSize(7).font('Helvetica').text(`CÓD. ${invoiceTypeCodeStr}`, midX - boxSize / 2, 72, { width: boxSize, align: 'center' });

                    doc.moveTo(midX, 70).lineTo(midX, 135).lineWidth(1).stroke();

                    // Business Data with Logo
                    if (config.businessLogo) {
                        try { doc.image(config.businessLogo, leftM + 5, 30, { width: 50 }); } catch (e) { }
                    }
                    const bX = config.businessLogo ? leftM + 60 : leftM + 10;
                    doc.fontSize(14).font('Helvetica-Bold').text(businessName.toUpperCase(), bX, 40, { width: midX - bX - 5 });
                    doc.fontSize(9).font('Helvetica-Bold').text('Razón Social:', leftM + 10, 75);
                    doc.font('Helvetica').text(businessName, leftM + 75, 75);
                    doc.font('Helvetica-Bold').text('Domicilio:', leftM + 10, 90);
                    doc.font('Helvetica').text(businessAddr || '-', leftM + 10, 100, { width: midX - leftM - 20 });
                    doc.font('Helvetica-Bold').text('Condición IVA:', leftM + 10, 120);
                    doc.font('Helvetica').text(condIva, leftM + 80, 120);

                    // Right Side
                    doc.fontSize(18).font('Helvetica-Bold').text('FACTURA', midX + 15, 40);
                    doc.fontSize(10).font('Helvetica-Bold').text(`Punto de Venta: ${salePointStr}`, midX + 15, 65);
                    doc.text(`Comp. Nro: ${invoiceNumStr}`, midX + 130, 65);
                    doc.text(`Fecha Emisión: ${invoiceDate}`, midX + 15, 80);
                    doc.text(`CUIT: ${config.cuit || '-'}`, midX + 15, 100);
                    doc.text(`Ingresos Brutos: 0`, midX + 15, 115);

                    // Frame Periods
                    doc.rect(leftM, 135, contentW, 20).stroke();
                    doc.fontSize(9).font('Helvetica-Bold').text('Vto. para pago:', midX + 15, 142);
                    doc.font('Helvetica').text(invoiceDate, midX + 100, 142);

                    // Client
                    doc.rect(leftM, 155, contentW, 45).stroke();
                    doc.fontSize(9).font('Helvetica-Bold').text(`${transaction.clientDocType || 'CUIT'}:`, leftM + 5, 162);
                    doc.font('Helvetica').text(transaction.clientDocNumber || '-', leftM + 35, 162);
                    doc.font('Helvetica-Bold').text('Nombre / Razón Social:', midX - 80, 162);
                    doc.font('Helvetica').text('Consumidor Final', midX + 25, 162);

                    // Table
                    const tTop = 205;
                    doc.rect(leftM, tTop, contentW, 20).fill('#ccc').stroke();
                    doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
                    doc.text('Producto', leftM + 45, tTop + 7);
                    doc.text('Cantidad', leftM + 225, tTop + 7, { width: 45, align: 'center' });
                    doc.text('Precio Unit.', leftM + 325, tTop + 7, { width: 60, align: 'right' });
                    doc.text('Subtotal', leftM + 480, tTop + 7, { width: 60, align: 'right' });

                    let y = tTop + 20;
                    doc.font('Helvetica').fontSize(8);
                    for (const item of transaction.items) {
                        doc.text(item.product?.name || item.description, leftM + 45, y + 4, { width: 175 });
                        doc.text(item.quantity.toFixed(2), leftM + 225, y + 4, { width: 45, align: 'center' });
                        doc.text((item.unitPriceCents / 100).toFixed(2), leftM + 325, y + 4, { width: 60, align: 'right' });
                        doc.text(((item.unitPriceCents * item.quantity) / 100).toFixed(2), leftM + 480, y + 4, { width: 60, align: 'right' });
                        y += 15;
                    }
                    doc.rect(leftM, tTop, contentW, 400).stroke();

                    // Total
                    const totY = tTop + 410;
                    doc.fontSize(12).font('Helvetica-Bold').text('Importe Total: $', rightM - 150, totY + 20, { width: 100, align: 'right' });
                    doc.text(totalPesos.toFixed(2), rightM - 70, totY + 20, { width: 70, align: 'right' });

                    // Footer
                    const fY = 720;
                    doc.image(qrBuffer, leftM, fY, { width: 70 });
                    doc.fontSize(12).font('Times-BoldItalic').text('ARCA', leftM + 80, fY);
                    doc.fontSize(10).font('Helvetica-Bold').text(`CAE Nº: ${transaction.invoiceCae}`, rightM - 180, fY + 10, { width: 180, align: 'right' });
                    doc.text(`Vto. CAE: ${caeExpiry}`, rightM - 180, fY + 25, { width: 180, align: 'right' });

                    doc.end();
                } catch (err) { reject(err); }
            })();
        });

        return { file: Buffer.concat(chunks).toString('base64'), fileName };
    }

    private async generateAndSavePdf(schoolId: number, transactionId: number): Promise<string> {
        const config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
        if (!config?.pdfSavePath) throw new Error('PDF save path not configured');
        const { file, fileName } = await this.generateInvoicePdf(schoolId, transactionId);
        if (!fs.existsSync(config.pdfSavePath)) fs.mkdirSync(config.pdfSavePath, { recursive: true });
        const filePath = path.join(config.pdfSavePath, `${fileName}.pdf`);
        fs.writeFileSync(filePath, Buffer.from(file, 'base64'));
        return filePath;
    }

    async emailInvoice(schoolId: number, transactionId: number, recipientEmail: string): Promise<void> {
        const config = await this.prisma.invoicingConfig.findUnique({ where: { schoolId } });
        if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) throw new BadRequestException('SMTP no configurado');

        const { file, fileName } = await this.generateInvoicePdf(schoolId, transactionId);
        const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
        const invoiceNum = transaction?.invoiceNumber || transactionId;

        const transporter = nodemailer.createTransport({
            host: config.smtpHost, port: config.smtpPort || 587, secure: config.smtpPort === 465,
            auth: { user: config.smtpUser, pass: config.smtpPass },
            tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
            from: `"${config.businessName || 'Facturación'}" <${config.smtpUser}>`,
            to: recipientEmail,
            subject: `Factura #${invoiceNum}`,
            text: `Adjunta factura N° ${salePointPad(config.salePoint)}-${String(invoiceNum).padStart(8, '0')}.`,
            attachments: [{ filename: `${fileName}.pdf`, content: Buffer.from(file, 'base64'), contentType: 'application/pdf' }],
        });
    }
}

function salePointPad(sp: number | null): string {
    return String(sp || 0).padStart(5, '0');
}
