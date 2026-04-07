import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateInvoicingConfigDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;

    @ApiPropertyOptional({ example: '20-12345678-9' })
    @IsOptional()
    @ValidateIf((o) => o.cuit !== null)
    @IsString()
    cuit?: string | null;

    @ApiPropertyOptional({ enum: ['MONOTRIBUTO', 'RESP_INSCRIPTO'] })
    @IsOptional()
    @IsString()
    fiscalCondition?: string;

    @ApiPropertyOptional({ example: 11, description: '11=Factura C, 6=Factura B' })
    @IsOptional()
    @Transform(({ value }) => value != null ? parseInt(value, 10) : value)
    @ValidateIf((o) => o.invoiceType !== null)
    @IsInt()
    invoiceType?: number;

    @ApiPropertyOptional({ example: 5, description: 'Punto de venta habilitado en ARCA' })
    @IsOptional()
    @Transform(({ value }) => value != null ? parseInt(value, 10) : value)
    @ValidateIf((o) => o.salePoint !== null)
    @IsInt()
    @Min(1)
    salePoint?: number | null;

    @ApiPropertyOptional({ description: 'Contenido del certificado (.crt o .pem)' })
    @IsOptional()
    @ValidateIf((o) => o.certContent !== null)
    @IsString()
    certContent?: string | null;

    @ApiPropertyOptional({ description: 'Contenido de la llave privada (.key)' })
    @IsOptional()
    @ValidateIf((o) => o.keyContent !== null)
    @IsString()
    keyContent?: string | null;

    @ApiPropertyOptional({ description: 'AfipSDK access token (de afipsdk.com)' })
    @IsOptional()
    @ValidateIf((o) => o.accessToken !== null)
    @IsString()
    accessToken?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    autoInvoice?: boolean;

    @ApiPropertyOptional({ description: 'Monto mínimo en centavos para facturar' })
    @IsOptional()
    @Transform(({ value }) => value != null ? parseInt(value, 10) : value)
    @ValidateIf((o) => o.minAmountCents !== null)
    @IsInt()
    @Min(0)
    minAmountCents?: number;

    @ApiPropertyOptional({ enum: ['testing', 'production'] })
    @IsOptional()
    @IsString()
    environment?: string;

    // PDF
    @ApiPropertyOptional({ description: 'Carpeta donde auto-guardar PDFs' })
    @IsOptional()
    @ValidateIf((o) => o.pdfSavePath !== null)
    @IsString()
    pdfSavePath?: string | null;

    @ApiPropertyOptional({ description: 'Nombre del negocio (para PDF)' })
    @IsOptional()
    @ValidateIf((o) => o.businessName !== null)
    @IsString()
    businessName?: string | null;

    @ApiPropertyOptional({ description: 'Dirección del negocio (para PDF)' })
    @IsOptional()
    @ValidateIf((o) => o.businessAddress !== null)
    @IsString()
    businessAddress?: string | null;

    // SMTP Email
    @ApiPropertyOptional({ description: 'Servidor SMTP (ej: smtp.gmail.com)' })
    @IsOptional()
    @ValidateIf((o) => o.smtpHost !== null)
    @IsString()
    smtpHost?: string | null;

    @ApiPropertyOptional({ description: 'Puerto SMTP (ej: 587)' })
    @IsOptional()
    @Transform(({ value }) => value != null ? parseInt(value, 10) : value)
    @ValidateIf((o) => o.smtpPort !== null)
    @IsInt()
    smtpPort?: number | null;

    @ApiPropertyOptional({ description: 'Email remitente' })
    @IsOptional()
    @ValidateIf((o) => o.smtpUser !== null)
    @IsString()
    smtpUser?: string | null;

    @ApiPropertyOptional({ description: 'Contraseña / App Password' })
    @IsOptional()
    @ValidateIf((o) => o.smtpPass !== null)
    @IsString()
    smtpPass?: string | null;

    @ApiPropertyOptional({ description: 'Asunto del email de factura' })
    @IsOptional()
    @ValidateIf((o) => o.emailSubject !== null)
    @IsString()
    emailSubject?: string | null;
}
