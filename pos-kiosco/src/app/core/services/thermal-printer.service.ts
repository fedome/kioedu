import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ThermalPrinterService {
  private port: any = null;
  private writer: any = null;
  
  private notifications = inject(NotificationService);

  get isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  async connect(): Promise<boolean> {
    if (!('serial' in navigator)) {
      this.notifications.error('No Soportado', 'Tu navegador no soporta la API WebSerial (Usa Chrome o Edge)');
      return false;
    }

    try {
      // Pedimos permiso al usuario para seleccionar el puerto serial (USB/COM)
      this.port = await (navigator as any).serial.requestPort();
      
      // La mayoría de ticketeadoras ESC/POS operan a 9600 o 115200 audios
      await this.port.open({ baudRate: 9600 });
      this.writer = this.port.writable.getWriter();
      
      this.notifications.success('Impresora Conectada', 'Lista para imprimir tickets rápidamente');
      return true;
    } catch (err: any) {
      console.error('Error conectando impresora térmica:', err);
      // Solo notificar si no fue que el usuario canceló el popup de selección
      if (!err.message.includes('No port selected')) {
        this.notifications.error('Error de Impresora', 'No se pudo conectar al puerto COM seleccionado');
      }
      return false;
    }
  }

  async disconnect() {
    if (this.writer) {
      await this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    this.notifications.info('Desconectada', 'Impresora térmica desconectada');
  }

  // --- ESC/POS COMANDOS BASE ---
  private readonly ESC = 0x1B;
  private readonly GS = 0x1D;

  private cmds = {
    INIT: [this.ESC, 0x40],
    ALIGN_LEFT: [this.ESC, 0x61, 0x00],
    ALIGN_CENTER: [this.ESC, 0x61, 0x01],
    BOLD_ON: [this.ESC, 0x45, 0x01],
    BOLD_OFF: [this.ESC, 0x45, 0x00],
    PAPER_CUT: [this.GS, 0x56, 0x00] // Cortar papel (Full cut)
  };

  private textEncoder = new TextEncoder(); // Codifica strings a Uint8Array (UTF-8, o podrías usar iconv para CP850 si tu impresora no soporta UTF-8 nativo)

  private formatCurrency(value: number): string {
    return '$ ' + value.toFixed(2);
  }

  /**
   * Envía los bytes crudos a la impresora 
   */
  private async sendCommand(bytes: number[] | Uint8Array) {
    if (!this.writer) return;
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    await this.writer.write(data);
  }

  /**
   * Envía una línea de texto con un salto de línea al final
   */
  private async printLine(text: string) {
    // Normalizamos acentos para impresoras térmicas básicas si no usamos codepages
    const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    await this.sendCommand(this.textEncoder.encode(normalized + '\n'));
  }

  /**
   * Imprime un ticket completo pasándole los datos de la venta y comercio
   */
  async printTicket(transaction: any, businessName: string, businessAddress: string) {
    if (!this.isConnected) {
      this.notifications.warning('Impresora no conectada', 'Reconecta la impresora térmica en Configuraciones');
      return;
    }

    try {
      // 1. Inicializar
      await this.sendCommand(this.cmds.INIT);

      // 2. Cabecera Comercial
      await this.sendCommand(this.cmds.ALIGN_CENTER);
      await this.sendCommand(this.cmds.BOLD_ON);
      await this.printLine(businessName);
      await this.sendCommand(this.cmds.BOLD_OFF);
      
      if (businessAddress) {
        await this.printLine(businessAddress);
      }
      await this.printLine('--------------------------------');

      // 3. Info del Ticket
      await this.sendCommand(this.cmds.ALIGN_LEFT);
      const fecha = new Date(transaction.completedAt).toLocaleString('es-AR');
      await this.printLine(`Ticket: #${transaction.id}`);
      await this.printLine(`Fecha: ${fecha}`);
      await this.printLine(`Cajero: ${transaction.cashier?.name || '-'}`);
      await this.printLine('--------------------------------');

      // 4. Ítems
      // Usaremos 32 columnas como ancho típico de ticketeadora 58mm
      for (const item of transaction.items) {
        const qtyStr = `${item.quantity}x `;
        const priceStr = this.formatCurrency(item.totalLineCents / 100);
        // Truncamos descripción si es muy larga
        const maxDescLen = 32 - qtyStr.length - priceStr.length - 1; 
        const desc = item.description.substring(0, maxDescLen);
        
        // Espaciado padding
        const spaces = 32 - (qtyStr.length + desc.length + priceStr.length);
        const pad = Array(Math.max(1, spaces)).join(' ');
        
        await this.printLine(`${qtyStr}${desc}${pad}${priceStr}`);
      }
      
      await this.printLine('--------------------------------');

      // 5. Totales
      await this.sendCommand(this.cmds.ALIGN_CENTER);
      await this.printLine(`SUBTOTAL: ${this.formatCurrency(transaction.subTotalCents / 100)}`);
      await this.sendCommand(this.cmds.BOLD_ON);
      await this.printLine(`TOTAL: ${this.formatCurrency(transaction.totalCents / 100)}`);
      await this.sendCommand(this.cmds.BOLD_OFF);
      
      await this.sendCommand(this.cmds.ALIGN_LEFT);
      const method = transaction.paymentMethod === 'CASH' ? 'Efectivo' : 'Saldo/Fiado';
      await this.printLine(`Medio de Pago: ${method}`);

      // 6. Pie y Corte de Papel
      await this.sendCommand(this.cmds.ALIGN_CENTER);
      await this.printLine(' ');
      await this.printLine('¡Gracias por su compra!');
      
      // Alimentar 4 lineas vacias para que el corte salga bien
      await this.printLine('\n\n\n\n'); 
      
      // Cortar papel
      await this.sendCommand(this.cmds.PAPER_CUT);

    } catch (err) {
      console.error('Fallo al escribir en puerto serial:', err);
      this.notifications.error('Error de Impresión', 'El cable pudo haberse desconectado');
      await this.disconnect(); // forzar limpieza
    }
  }

}
