import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Child } from 'src/app/interfaces/child.interface';
import { PaymentsService } from 'src/app/services/payments/payments.service';
import { UiNotificationsService } from "../../services/notification/ui-notifications.service";
import { NotificationEventsService } from 'src/app/services/notification/notification-events.service';
import { addIcons } from 'ionicons';
import { cardOutline, storefrontOutline, walletOutline, closeOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-topup-modal',
  standalone: true,
  templateUrl: './topup-modal.component.html',
  styleUrls: ['./topup-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class TopupModalComponent {
  @Input() child!: Child;
  @Input() initialView: 'form' | 'ticket' = 'form';
  @Input() pendingTransaction: any = null;

  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private paymentsService = inject(PaymentsService);
  private uiNotifications = inject(UiNotificationsService);
  private notificationEvents = inject(NotificationEventsService);

  newFormatValue: string = '';
  amounts = [1000, 2000, 5000];
  selectedAmount: number | null = null;
  paymentMethods = [
    { id: 'mp', name: 'Mercado Pago', icon: 'card-outline', color: '#009ee3' },
    { id: 'cash', name: 'Efectivo en Kiosco', icon: 'storefront-outline', color: '#64748b' }
  ];
  selectedMethod = 'mp';
  isTicketView = false;
  ticketAmount = 0;
  ticketRef = '';
  form: FormGroup;

  constructor() {
    addIcons({ cardOutline, storefrontOutline, walletOutline, closeOutline, checkmarkCircleOutline });
    this.form = this.fb.group({
      amount: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    if (this.initialView === 'ticket' && this.pendingTransaction) {
      this.isTicketView = true;
      this.ticketAmount = this.pendingTransaction.amountCents;
      this.ticketRef = this.pendingTransaction.id;
    }
  }

  onAmountInput(ev: any) {
    const value = ev.detail.value ?? '';
    const [intPartRaw, decimalPartRaw] = value.split(',');
    const intDigits = (intPartRaw || '').replace(/\D/g, '');
    const intFormatted = this.formatMiles(intDigits);
    let newValue = intFormatted;

    if (decimalPartRaw !== undefined) {
      const dec = decimalPartRaw.replace(/\D/g, '').slice(0, 2);
      if (dec.length) {
        newValue += ',' + dec;
      }
    }

    this.form.get('amount')?.setValue(newValue, { emitEvent: false });
    const rawNum = parseInt(intDigits, 10);
    if (this.selectedAmount !== rawNum) {
      this.selectedAmount = null;
    }
  }

  selectAmount(amt: number) {
    this.selectedAmount = amt;
    const formatted = this.formatMiles(amt.toString());
    this.form.get('amount')?.setValue(formatted);
  }

  selectMethod(methodId: string) {
    this.selectedMethod = methodId;
  }

  private formatMiles(valor: string): string {
    if (!valor) return '';
    this.newFormatValue = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawControl = this.form.value.amount ?? '';
    const raw = String(rawControl)
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();

    if (!raw) return;

    const num = Number(raw);
    if (!isFinite(num) || num <= 0) {
      this.uiNotifications.error(
        'Monto inválido',
        'Ingresá un monto mayor a $0.'
      );
      return;
    }

    const amountCents = Math.round(num * 100);

    if (this.selectedMethod === 'mp') {
      // -- FLUJO REAL MERCADO PAGO --
      this.paymentsService.createMPPreference(this.child.id, amountCents).subscribe({
        next: async (res) => {
          if (res.init_point) {
            window.location.href = res.init_point;
          } else {
            this.uiNotifications.error('Error de pago', 'No se pudo generar la preferencia de Mercado Pago.');
            await this.modalCtrl.dismiss(null, 'cancel');
          }
        },
        error: async (err) => {
          console.error('Error MP Preference:', err);
          this.uiNotifications.error('Error de pago', 'No se pudo conectar con Mercado Pago. Intentá de nuevo más tarde.');
          await this.modalCtrl.dismiss(null, 'cancel');
        }
      });
    } else {
      // -- FLUJO SIMULADO (CASH u otros) --
      this.paymentsService.topupChild(this.child.id, amountCents, this.selectedMethod).subscribe({
        next: async (res) => {
          if (this.selectedMethod === 'cash') {
            // Mostrar el Ticket en vez de cerrar el modal
            this.isTicketView = true;
            this.ticketAmount = amountCents;
            this.ticketRef = res.externalRef || res.id;
          } else {
            const fullName = `${this.child.firstName} ${this.child.lastName}`.trim();
            this.notificationEvents.notifyMovement(fullName, amountCents, 'TOPUP');
            await this.modalCtrl.dismiss({ refreshed: true }, 'confirm');
          }
        },
        error: async (err: any) => {
          this.uiNotifications.error(
            'No se pudo realizar la recarga',
            'Revisá la conexión o intentá más tarde.'
          );
        },
      });
    }
  }
}
