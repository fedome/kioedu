import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionsService } from '../../../core/services/transactions.service';
import { PrintingService } from '../../../core/services/printing.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InvoicingService } from '../../../core/services/invoicing.service';
import { CashierAuthService } from '../../../core/auth/cashier-auth.service';
import { UiService } from '../../../core/services/ui.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Local types to avoid Prisma dependency in frontend
type TransactionType = 'SALE' | 'CREDIT';
type PaymentMethod = 'CASH' | 'CARD' | 'ACCOUNT' | 'TRANSFER' | 'MERCADOPAGO';
type TransactionStatus = 'PAID' | 'PENDING' | 'VOID' | 'FAILED';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.scss']
})
export class TransactionsHistoryComponent implements OnInit {
  private transactionsService = inject(TransactionsService);
  private printingService = inject(PrintingService);
  private notifications = inject(NotificationService);
  private invoicingService = inject(InvoicingService);
  private auth = inject(CashierAuthService);
  private ui = inject(UiService);
  private confirmService = inject(ConfirmService);
  private cdr = inject(ChangeDetectorRef);

  transactions: any[] = [];
  loading = false;
  searchTerm = '';
  selectedRange: 'today' | 'week' | 'month' | 'custom' = 'today';

  customFrom: string = '';
  customTo: string = '';

  invoicingTxId: number | null = null;
  downloadingPdfTxId: number | null = null;
  emailingTxId: number | null = null;

  ngOnInit() {
    this.ui.setPageTitle('Historial', 'Registro de ventas y transacciones');
    this.loadTransactions();
  }

  onRangeChange(range: 'today' | 'week' | 'month' | 'custom') {
    this.selectedRange = range;
    if (range !== 'custom') {
      this.loadTransactions();
    }
  }

  loadTransactions() {
    this.loading = true;
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (this.selectedRange === 'today') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (this.selectedRange === 'week') {
      from.setDate(now.getDate() - 7);
    } else if (this.selectedRange === 'month') {
      from.setDate(1); // Inicio de mes
    } else if (this.selectedRange === 'custom') {
      if (!this.customFrom || !this.customTo) return;
      from = new Date(this.customFrom);
      to = new Date(this.customTo);
      to.setHours(23, 59, 59, 999);
    }

    const query = {
      from: from.toISOString(),
      to: to.toISOString(),
      page: 1,
      pageSize: 1000
    };

    this.transactionsService.getDailyTransactions(query).subscribe({
      next: (res: any) => {
        this.transactions = res.rows || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.transactions = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getRangeLabel(): string {
    switch (this.selectedRange) {
      case 'today': return 'Hoy';
      case 'week': return 'Última Semana';
      case 'month': return 'Este Mes';
      case 'custom': return 'Personalizado';
      default: return '';
    }
  }

  get filteredTransactions() {
    if (!this.transactions) return [];
    if (!this.searchTerm) return this.transactions;
    const term = this.searchTerm.toLowerCase();
    return this.transactions.filter(t => {
      const idMatch = t.id?.toString().includes(term);
      const totalMatch = (t.totalCents / 100).toString().includes(term);
      const typeMatch = t.type?.toLowerCase().includes(term);
      const invoiceMatch = t.invoiceNumber?.toString().includes(term) || t.invoiceCae?.toLowerCase().includes(term);
      return idMatch || totalMatch || typeMatch || invoiceMatch;
    });
  }

  get totalSales(): number {
    return this.filteredTransactions.reduce((acc, t) => acc + (t.totalCents || 0), 0) / 100;
  }

  get totalCount(): number {
    return this.filteredTransactions.length;
  }

  exportToPDF() {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Historial de Transacciones - KioEdu', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${this.getRangeLabel()}`, 14, 28);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, 14, 34);

    const dataRows = this.filteredTransactions.map(t => [
      `#${t.id}`,
      new Date(t.startedAt).toLocaleDateString('es-AR') + ' ' + new Date(t.startedAt).toLocaleTimeString('es-AR').substring(0, 5),
      t.type === 'SALE' ? 'VENTA' : 'CARGA',
      t.paymentMethod,
      `$ ${(t.totalCents / 100).toLocaleString('es-AR')}`,
      t.status,
      t.invoiceCae ? `FACT #${t.invoiceNumber}` : '-'
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Ticket', 'Fecha/Hora', 'Tipo', 'Pago', 'Total', 'Estado', 'Comprobante']],
      body: dataRows,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }, // Indigo 500
    });

    doc.save(`Historial_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  reprint(tx: any) {
    if (!tx.items || tx.items.length === 0) {
      this.transactionsService.getById(tx.id).subscribe({
        next: (fullTx) => this.printingService.printTicket(fullTx),
        error: () => this.notifications.error('Error', 'No se pudo cargar el ticket completo')
      });
    } else {
      this.printingService.printTicket(tx);
    }
    this.notifications.success('Imprimiendo', `Ticket #${tx.id}`);
  }

  async voidTransaction(tx: any) {
    const reason = await this.confirmService.prompt({
      title: 'Anular Ticket',
      message: `Dejale un motivo a la anulación de la transacción #${tx.id}`,
      inputPlaceholder: 'Motivo de anulación...',
      confirmText: 'Anular',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!reason) return;
    
    const ok = await this.confirmService.confirm({
      title: 'Confirmación irreversible',
      message: 'Esta acción es irreversible. ¿Continuar?',
      confirmText: 'Sí, anular',
      type: 'danger'
    });
    if (!ok) return;

    this.transactionsService.voidTransaction(tx.id, reason).subscribe({
      next: () => {
        this.notifications.success('Anulada', `Ticket #${tx.id} anulado`);
        this.loadTransactions();
      },
      error: (err) => this.notifications.error('Error', err.error?.message || 'No se pudo anular')
    });
  }

  async invoiceTransaction(tx: any) {
    const schoolId = this.auth.currentUser()?.schoolId;
    if (!schoolId) return;

    this.invoicingTxId = tx.id;
    try {
      // Manual/Retry invoicing call
      const result = await this.invoicingService.retryInvoice(schoolId, tx.id);
      tx.invoiceCae = result.cae;
      tx.invoiceNumber = result.invoiceNumber;
      tx.invoiceCaeExpiry = result.caeExpiry;
      tx.invoiceError = null; // Clear error on success
      this.notifications.success('Facturado', `CAE: ${result.cae}`);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Error ARCA';
      this.notifications.error('Error al facturar', msg);
      tx.invoiceError = msg; // Update local state for view
    } finally {
      this.invoicingTxId = null;
      this.cdr.detectChanges();
    }
  }

  async downloadPdf(tx: any) {
    if (!tx.invoiceCae) return;
    const schoolId = this.auth.currentUser()?.schoolId;
    if (!schoolId) return;
    this.downloadingPdfTxId = tx.id;
    try {
      const result = await this.invoicingService.downloadPdf(schoolId, tx.id);
      const byteArray = Uint8Array.from(atob(result.file), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.fileName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      this.notifications.error('Error PDF', err?.error?.message || 'No se pudo generar');
    } finally {
      this.downloadingPdfTxId = null;
      this.cdr.detectChanges();
    }
  }

  async emailInvoice(tx: any) {
    if (!tx.invoiceCae) return;
    const schoolId = this.auth.currentUser()?.schoolId;
    if (!schoolId) return;

    const email = await this.confirmService.prompt({
      title: 'Enviar por Email',
      message: 'Ingresa el correo electrónico para enviar la factura',
      inputPlaceholder: 'correo@ejemplo.com',
      inputType: 'email',
      confirmText: 'Enviar'
    });
    if (!email) return;

    this.emailingTxId = tx.id;
    try {
      await this.invoicingService.emailInvoice(schoolId, tx.id, email);
      this.notifications.success('Email enviado', `Enviado a ${email}`);
    } catch (err: any) {
      this.notifications.error('Error Email', err?.error?.message || 'No se pudo enviar');
    } finally {
      this.emailingTxId = null;
      this.cdr.detectChanges();
    }
  }
}
