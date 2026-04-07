import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { firstValueFrom } from 'rxjs';

export interface InvoicingConfig {
    id?: number;
    schoolId?: number;
    isEnabled: boolean;
    cuit: string | null;
    fiscalCondition: string;
    invoiceType: number;
    salePoint: number | null;
    autoInvoice: boolean;
    minAmountCents: number;
    environment: string;
    accessToken?: string | null;
    certContent?: string | null;
    keyContent?: string | null;
    // PDF
    pdfSavePath?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    businessLogo?: string | null;
    // Email SMTP
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    emailSubject?: string | null;
    // Status
    lastError?: string | null;
}

export interface ArcaStatus {
    available: boolean;
    appServer?: string;
    dbServer?: string;
    authServer?: string;
    error?: string;
}

export interface InvoiceResult {
    invoiceNumber: number;
    cae: string;
    caeExpiry: string;
    invoiceType: number;
    salePoint: number;
    total: number;
}

@Injectable({ providedIn: 'root' })
export class InvoicingService {
    private api = inject(ApiService);

    async getConfig(schoolId: number): Promise<InvoicingConfig> {
        return firstValueFrom(this.api.get<InvoicingConfig>('/invoicing/config', { schoolId }));
    }

    async updateConfig(schoolId: number, data: Partial<InvoicingConfig>): Promise<InvoicingConfig> {
        return firstValueFrom(this.api.put<InvoicingConfig>(`/invoicing/config?schoolId=${schoolId}`, data));
    }


    async checkStatus(schoolId: number): Promise<ArcaStatus> {
        return firstValueFrom(this.api.get<ArcaStatus>('/invoicing/status', { schoolId }));
    }

    async getLastInvoice(schoolId: number) {
        return firstValueFrom(this.api.get<any>('/invoicing/last', { schoolId }));
    }

    async createInvoice(schoolId: number, transactionId: number, docType?: number, docNumber?: string): Promise<InvoiceResult> {
        return firstValueFrom(this.api.post<InvoiceResult>('/invoicing/invoice', {
            transactionId,
            docType,
            docNumber,
        }, { params: { schoolId } }));
    }

    async retryInvoice(schoolId: number, transactionId: number): Promise<InvoiceResult> {
        return firstValueFrom(this.api.post<InvoiceResult>('/invoicing/invoice/retry', {
            transactionId
        }, { params: { schoolId } }));
    }

    async downloadPdf(schoolId: number, transactionId: number): Promise<{ file: string; fileName: string }> {
        return firstValueFrom(this.api.get<{ file: string; fileName: string }>('/invoicing/invoice/pdf', {
            schoolId,
            transactionId,
        }));
    }

    async emailInvoice(schoolId: number, transactionId: number, recipientEmail: string): Promise<void> {
        return firstValueFrom(this.api.post<void>('/invoicing/invoice/email', {
            transactionId,
            recipientEmail,
        }, { params: { schoolId } }));
    }
}
