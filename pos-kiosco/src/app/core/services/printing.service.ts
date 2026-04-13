import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { NotificationService } from './notification.service';
import { ThermalPrinterService } from './thermal-printer.service';

@Injectable({
  providedIn: 'root'
})
export class PrintingService {
  private settings = inject(SettingsService);
  private notifications = inject(NotificationService);
  private thermalPrinter = inject(ThermalPrinterService);

  private formatCurrency(value: number): string {
    // Format number with Argentine locale (dots for thousands, commas for decimals)
    // Using minimumFractionDigits: 0 ensures integers appear as "23.000" instead of "23.000,00" if requested,
    // but typically for currency we want decimals. The user said "a person spends 23000, seen as 23.000".
    // I will use standard currency format but ensure dots are used.
    // However, user example 23000 -> 23.000 suggests no decimals for whole numbers or just dot separator.
    // Let's use the standard Angular currency pipe behavior via Intl: $ 1.234,56
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  // Helper for printing logic
  private async printContent(html: string, jobName: string) {
    // Intentar impresión directa via Electron
    const printerApi = (window as any).printer;
    if (printerApi?.print) {
      const printerName = this.settings.printerName;
      console.log(`🖨️ Imprimiendo ${jobName} directo a:`, printerName || 'impresora por defecto');

      const result = await printerApi.print(html, printerName);
      if (result.success) {
        console.log(`✅ ${jobName} impreso correctamente`);
        return;
      } else {
        console.warn(`⚠️ Error en impresión directa de ${jobName}, usando popup:`, result.error);
      }
    }

    // Fallback: Abrir popup
    this.printViaPopup(html, jobName);
  }

  async printTicket(transaction: any) {
    if (this.settings.settings().useWebSerialPrinter && this.thermalPrinter.isConnected) {
      await this.thermalPrinter.printTicket(transaction, this.settings.businessName, this.settings.businessAddress);
      return;
    }

    const ticketHtml = this.generateTicketHtml(transaction);
    await this.printContent(ticketHtml, `Ticket #${transaction.id}`);
  }

  /**
   * Imprime el Reporte Z (Cierre de Caja)
   */
  async printZReport(data: { session: any, summary: any }) {
    const html = this.generateReportHtml('CIERRE DE CAJA (Z)', data);
    await this.printContent(html, 'Reporte Z');
  }

  /**
   * Imprime el Reporte X (Parcial)
   */
  async printXReport(data: { session: any, summary: any }) {
    const html = this.generateReportHtml('CORTE X (PARCIAL)', data);
    await this.printContent(html, 'Corte X');
  }

  private generateTicketHtml(transaction: any): string {
    const businessName = this.settings.businessName || 'KioEdu';
    const businessAddress = this.settings.businessAddress || '';
    const fecha = new Date(transaction.completedAt).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    return `
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              width: 58mm;
              padding: 2mm;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 4px 0; }
            .title { font-size: 14px; font-weight: bold; }
            .item-row { display: flex; justify-content: space-between; }
            .item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 78%; }
            .item-total { text-align: right; }
            .total-section { margin-top: 4px; }
            .total-big { font-size: 14px; font-weight: bold; }
            .footer { font-size: 10px; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">${businessName}</div>
            ${businessAddress ? `<div>${businessAddress}</div>` : ''}
          </div>
          <div class="line"></div>
          <div>Ticket: #${transaction.id}</div>
          <div>Fecha: ${fecha}</div>
          <div>Cajero: ${transaction.cashier?.name || '-'}</div>
          <div class="line"></div>
          
          ${transaction.items.map((item: any) => `
            <div class="item-row">
              <span class="item-name">${item.quantity}x ${item.description}</span>
              <span class="item-total">${this.formatCurrency(item.totalLineCents / 100)}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          <div class="total-section">
            <div class="item-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(transaction.subTotalCents / 100)}</span>
            </div>
            <div class="item-row total-big">
              <span>TOTAL:</span>
              <span>${this.formatCurrency(transaction.totalCents / 100)}</span>
            </div>
            <div class="item-row">
              <span>Pago:</span>
              <span>${transaction.paymentMethod === 'CASH' ? 'Efectivo' : 'Saldo'}</span>
            </div>
          </div>
          <div class="line"></div>

          ${transaction.invoiceCae ? `
          <div class="center total-section">
            <div class="bold">${transaction.invoiceType === 6 ? 'Factura B' : transaction.invoiceType === 11 ? 'Factura C' : transaction.invoiceType === 1 ? 'Factura A' : 'Ticket Factura'}</div>
            <div>CAE: ${transaction.invoiceCae}</div>
            <div>Vto CAE: ${transaction.invoiceCaeExpiry ? new Date(transaction.invoiceCaeExpiry).toLocaleDateString('es-AR') : '-'}</div>
          </div>
          <div class="line"></div>
          ` : `
          <div class="center total-section">
            <div>DOCUMENTO NO VALIDO COMO FACTURA</div>
          </div>
          <div class="line"></div>
          `}

          <div class="footer center">
            <div>¡Gracias!</div>
          </div>
        </body>
      </html>
    `;
  }

  private printViaPopup(html: string, title: string) {
    const popup = window.open('', '_blank', 'width=400,height=600');

    if (popup) {
      const fullHtml = html.includes('<script>') ? html : `
        ${html}
        <script>
          window.onload = function() {
            document.title = '${title}';
            window.print();
          }
        </script>
      `;
      popup.document.open();
      popup.document.write(fullHtml);
      popup.document.close();
    } else {
      this.notifications.warning('Popups bloqueados', 'Por favor habilita los popups para imprimir tickets.');
    }
  }


  /**
   * Genera el HTML para reporte X o Z
   */
  private generateReportHtml(title: string, data: { session: any, summary: any }) {
    const s = data.session;
    const sum = data.summary;

    const openDate = new Date(s.openedAt).toLocaleString('es-AR');
    const closeDate = s.closedAt ? new Date(s.closedAt).toLocaleString('es-AR') : 'AL INSTANTE';

    // Cálculos
    const diff = s.diffCents ? s.diffCents / 100 : 0;
    const resultText = diff === 0 ? 'PERFECTO' : (diff > 0 ? 'SOBRANTE' : 'FALTANTE');
    const showDiff = !!s.closedAt; // Solo mostrar diferencia si está cerrado (Z)

    return `
      <div style="font-family: 'Courier New', monospace; font-size: 12px; width: 280px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <h2 style="margin: 0;">${title}</h2>
          <p style="margin: 0;">KioEdu</p>
          <p style="margin: 0;">--------------------------------</p>
        </div>

        <div style="margin-bottom: 10px;">
          <div><strong>Cajero:</strong> ${s.cashier?.name || 'Desconocido'}</div>
          <div><strong>Apertura:</strong> ${openDate}</div>
          <div><strong>Cierre/Hora:</strong> ${closeDate}</div>
          <div><strong>Terminal:</strong> #${s.terminalId}</div>
          <div><strong>Sesión ID:</strong> #${s.id}</div>
        </div>

        <p style="margin: 0;">--------------------------------</p>

        <div style="display: flex; justify-content: space-between;">
          <span>Fondo Inicial:</span>
          <span>${this.formatCurrency(s.openingBalanceCents / 100)}</span>
        </div>

        <br>
        <strong>VENTAS:</strong>
        <div style="display: flex; justify-content: space-between;">
          <span>Efectivo (+):</span>
          <span>${this.formatCurrency(sum.salesCash || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Cuenta/Saldo:</span>
          <span>${this.formatCurrency(sum.salesAccount || 0)}</span>
        </div>

        ${(sum.topupsCash || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Recargas Efec. (+):</span>
          <span>${this.formatCurrency(sum.topupsCash || 0)}</span>
        </div>` : ''}

        ${(sum.refundsCash || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Devoluciones Efec. (-):</span>
          <span>${this.formatCurrency(sum.refundsCash || 0)}</span>
        </div>` : ''}

        <br>
        <strong>MOVIMIENTOS DE CAJA:</strong>
        <div style="display: flex; justify-content: space-between;">
          <span>Ingresos/Retiros:</span>
          <span>${this.formatCurrency(sum.movementsTotal || 0)}</span>
        </div>

        <p style="margin: 0;">--------------------------------</p>

        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>TOTAL ESPERADO:</span>
          <span>${this.formatCurrency(s.expectedBalanceCents / 100)}</span>
        </div>

        ${showDiff ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Dinero Contado:</span>
          <span>${this.formatCurrency(s.closingBalanceCents / 100)}</span>
        </div>

        <p style="margin: 0;">--------------------------------</p>

        <div style="text-align: center; margin-top: 5px;">
          <strong>DIFERENCIA:</strong><br>
          <span style="font-size: 14px; font-weight: bold; ${diff < 0 ? 'text-decoration: underline;' : ''}">
            ${this.formatCurrency(diff)} (${resultText})
          </span>
        </div>
        ` : ''}

        <br>
        <div style="text-align: center;">
          <p>*** FIN DE REPORTE ***</p>
        </div>
      </div>
    `;
  }
}
