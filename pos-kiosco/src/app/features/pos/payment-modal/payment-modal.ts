import { Component, EventEmitter, Input, Output, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../../core/services/ui.service';

export interface InvoicingData {
  shouldInvoice: boolean;
  docType: number;
  docNumber: string;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.html',
  styleUrls: ['./payment-modal.scss']
})
export class PaymentModalComponent {
  @ViewChild('amountPaidInput') amountPaidInput!: ElementRef<HTMLInputElement>;

  ui = inject(UiService);

  @Input() total!: number;
  @Input() childName?: string;
  @Input() isScanned: boolean = false;
  @Input() qrCodeUrl?: string;

  @Output() cancel = new EventEmitter<void>();
  @Output() pay = new EventEmitter<{ method: 'CASH' | 'CARD' | 'MERCADOPAGO', invoicing?: InvoicingData }>();

  method: 'CASH' | 'CARD' | 'MERCADOPAGO' = 'CASH';
  amountPaid: number | null = null;
  loadingMP = false;

  // Invoicing fields
  shouldInvoice = false;
  docType = 99;
  docNumber = '';

  docTypes = [
    { id: 99, name: 'Sin Identificar (Cons. Final)' },
    { id: 96, name: 'DNI' },
    { id: 80, name: 'CUIT' },
    { id: 86, name: 'CUIL' }
  ];

  get vuelto(): number {
    if (this.method === 'MERCADOPAGO') return 0;
    if (!this.amountPaid) return -this.total;
    return this.amountPaid - this.total;
  }

  onMethodChange(newMethod: 'CASH' | 'CARD' | 'MERCADOPAGO') {
    this.method = newMethod;
    if (newMethod === 'CASH') {
      setTimeout(() => {
        this.amountPaidInput?.nativeElement?.focus();
        this.amountPaidInput?.nativeElement?.select();
      }, 0);
    }
  }

  get invoiceFormValid(): boolean {
    if (!this.shouldInvoice) return true;
    if (this.docType === 99) return true; // Consumidor Final doesn't need doc number
    return this.docNumber.trim().length >= 7;
  }

  confirm() {
    if (!this.invoiceFormValid) return;

    this.pay.emit({
      method: this.method,
      invoicing: this.shouldInvoice ? {
        shouldInvoice: true,
        docType: this.docType,
        docNumber: this.docNumber.trim()
      } : undefined
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const targetInfo = (event.target as HTMLElement).tagName;
    const isTyping = targetInfo === 'INPUT' || targetInfo === 'SELECT' || targetInfo === 'TEXTAREA';

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }

    if (event.key === 'Enter') {
      // Prevent default to avoid form firing multiple times on 'Enter'
      event.preventDefault();
      if ((this.method !== 'CASH' || this.vuelto >= 0) && this.invoiceFormValid) {
        this.confirm();
      }
      return;
    }

    if (!isTyping || (event.key.startsWith('F') && !isNaN(Number(event.key.substring(1))))) {
      switch (event.key) {
        case 'F1':
          event.preventDefault();
          this.onMethodChange('CASH');
          break;
        case 'F2':
          event.preventDefault();
          if (this.childName) this.onMethodChange('CARD');
          break;
        case 'F3':
          event.preventDefault();
          if (this.ui.isOnline()) this.onMethodChange('MERCADOPAGO');
          break;
      }
    }
  }
}
