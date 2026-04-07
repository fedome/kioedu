import { Component, Input, inject, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  ModalController,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Child } from 'src/app/interfaces/child.interface';
import { ChildrenService } from 'src/app/services/children/children.service';
import { NfcService } from '../../services/nfc/nfc.service';

@Component({
  selector: 'app-link-card-modal',
  standalone: true,
  templateUrl: './link-card-modal.component.html',
  styleUrls: ['./link-card-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class LinkCardModalComponent implements OnInit {
  @Input() child!: Child;

  // Si lo abrís desde la opción "nfc", ponelo en true para que arranque solo.
  @Input() autoScan = false;

  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private childrenService = inject(ChildrenService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private nfc = inject(NfcService);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;

  scanning = false;
  saving = false;

  constructor() {
    this.form = this.fb.group({
      uid: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9A-F]{4,32}$/), // solo HEX, ya normalizado a mayúsculas
        ],
      ],
    });

    // Normalizar: sacar 0x, :, espacios, guiones, etc. y pasar a HEX uppercase
    this.uidCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: unknown) => {
        const raw = String(value ?? '');
        const normalized = raw
          .replace(/^0x/i, '')
          .replace(/[^0-9a-f]/gi, '')
          .toUpperCase();

        if (normalized !== raw) {
          this.uidCtrl.setValue(normalized, { emitEvent: false });
        }
      });
  }

  ngOnInit() {
    if (this.autoScan) {
      // arrancá lectura automáticamente cuando el modal aparece
      queueMicrotask(() => this.readWithNfc(true));
    }
  }

  get uidCtrl() {
    return this.form.get('uid')!;
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async readWithNfc(autoSaveAfterRead = false) {
    if (this.scanning || this.saving) return;

    this.scanning = true;

    setTimeout(() => {
      if (this.scanning) {
        this.scanning = false;
        loading.dismiss().catch(() => { });
      }
    }, 10000); // seguridad: cortar después de 60s

    const loading = await this.loadingCtrl.create({
      message: 'Acercá la tarjeta al NFC…',
      backdropDismiss: true,
    });
    await loading.present();

    try {
      const uid = await this.nfc.readCardUidOnce(); // ideal: que ya devuelva HEX sin separadores
      if (!uid) return;

      // Si el servicio devuelve algo tipo "04:AA:.." o "0x04aa", lo normalizamos igual.
      this.form.patchValue({ uid });
      this.uidCtrl.markAsTouched();
      this.uidCtrl.markAsDirty();
      this.form.updateValueAndValidity();

      if (autoSaveAfterRead) {
        await this.submit();
      }
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message || 'No se pudo leer la tarjeta por NFC.',
        duration: 2500,
        color: 'danger',
      });
      await toast.present();

      // Solo cerrar el modal si se abrió desde la opción NFC (autoScan).
      // Si el usuario abrió el modal manual y tocó "Leer con NFC", lo dejamos abierto para que pueda ingresar el código.
      if (this.autoScan) {
        this.cancel();
      }
    } finally {
      this.scanning = false;
      await loading.dismiss().catch(() => { });
    }
  }

  async submit() {
    if (this.saving) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const uid = this.uidCtrl.value as string;

    this.saving = true;

    const loading = await this.loadingCtrl.create({
      message: 'Vinculando tarjeta…',
    });
    await loading.present();

    try {
      const updatedChild = await firstValueFrom(
        this.childrenService.linkCard(this.child.id, uid)
      );

      /*const toast = await this.toastCtrl.create({
        message: 'Tarjeta vinculada correctamente.',
        duration: 2000,
        color: 'success',
      });*/
      //await toast.present();

      await this.modalCtrl.dismiss({ updatedChild }, 'confirm');
    } catch (err: any) {
      const backendMsg = err?.error?.message;
      const msg = Array.isArray(backendMsg)
        ? backendMsg.join(' ')
        : backendMsg || 'No se pudo vincular la tarjeta.';

      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();

      // Importante: NO cerramos el modal en error, así puede corregir/volver a intentar.
    } finally {
      this.saving = false;
      await loading.dismiss().catch(() => { });
    }
  }
}
