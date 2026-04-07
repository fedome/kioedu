import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Child } from 'src/app/interfaces/child.interface';
import { LimitsService } from 'src/app/services/limits/limits.service';
import {UiNotificationsService} from "../../services/notification/ui-notifications.service";

@Component({
  selector: 'app-limit-modal',
  standalone: true,
  templateUrl: './limit-modal.component.html',
  styleUrls: ['./limit-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class LimitModalComponent {
  @Input() child!: Child;

  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);
  private limitsService = inject(LimitsService);
  private uiNotifications = inject(UiNotificationsService);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      // antes: limit: ['', [Validators.required]],
      limit: [''], // sin Validators.required
    });
  }


  ngOnInit() {
    // Prellenar con límite actual si existe
    if (this.child.dailyLimit?.limitCents != null) {
      const current = this.child.dailyLimit.limitCents / 100;
      this.form.patchValue({ limit: current.toString() });
    }
  }

  onLimitInput(ev: any) {
    const value = ev.detail.value ?? '';

    // separamos parte entera y decimal por coma
    const [intPartRaw, decimalPartRaw] = value.split(',');

    // solo dígitos en la parte entera
    const intDigits = (intPartRaw || '').replace(/\D/g, '');
    const intFormatted = this.formatMiles(intDigits);

    let newValue = intFormatted;

    // parte decimal (máx 2 dígitos)
    if (decimalPartRaw !== undefined) {
      const dec = decimalPartRaw.replace(/\D/g, '').slice(0, 2);
      if (dec.length) {
        newValue += ',' + dec;
      }
    }

    // seteamos al form sin disparar valueChanges recursivo
    this.form.get('limit')?.setValue(newValue, { emitEvent: false });
  }


  private formatMiles(valor: string): string {
    if (!valor) return '';
    // insertamos puntos cada 3 dígitos desde la derecha
    return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Ej: "1.500,50" -> "1500,50" -> "1500.50"
    const rawControl = this.form.value.limit ?? '';
    const raw = String(rawControl)
      .replace(/\./g, '') // sacamos separadores de miles
      .replace(',', '.')
      .trim();

    // Si dejó vacío -> sin límite
    if (!raw) {
      this.callApi(null);
      return;
    }

    const num = Number(raw);
    if (!isFinite(num) || num <= 0) {
      const t = await this.toastCtrl.create({
        message: 'Ingresá un límite válido.',
        duration: 2500,
        color: 'warning',
      });
      await t.present();
      return;
    }

    const limitCents = Math.round(num * 100);
    this.callApi(limitCents);
  }


  private callApi(limitCents: number | null) {
    this.limitsService.setDailyLimit(this.child.id, limitCents).subscribe({
      next: async (resp) => {
        const newLimit = resp?.limitCents ?? limitCents;

        this.uiNotifications.success(
          'Límite actualizado correctamente.',
          `Nuevo límite: $ ${ (resp?.limitCents ?? limitCents) / 100 } / día`
        );

        await this.modalCtrl.dismiss(
          {
            childId: this.child.id,
            limitCents: newLimit,
            updatedAt: resp?.updatedAt ?? new Date().toISOString(),
          },
          'confirm',
        );
      },
      error: async (err) => {
        console.error('Error al actualizar límite', err);

        this.uiNotifications.error(
          'No se pudo actualizar el límite.',
          'Intentá de nuevo.'
        );
      },
    });
  }

}
