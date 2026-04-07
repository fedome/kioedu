// src/app/services/notifications.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastController } from '@ionic/angular';

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly STORAGE = {
    movements: 'mk-settings-notify-movements',
    lowBalance: 'mk-settings-notify-low-balance',
    limitReached: 'mk-settings-notify-limit-reached',
    news: 'mk-settings-notify-news',
  } as const;

  constructor(private toastCtrl: ToastController) {}

  // ====== helpers de storage ======
  private readBool(key: string, def: boolean): boolean {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === '1';
  }

  private writeBool(key: string, value: boolean) {
    localStorage.setItem(key, value ? '1' : '0');
  }

  // ====== PREFERENCIAS (campanita + settings) ======

  // 👉 movimientos (campanita de las páginas)
  private movementsEnabledSubject = new BehaviorSubject<boolean>(
    (() => {
      const k = this.STORAGE.movements;
      const v = localStorage.getItem(k);
      if (v === null) return true; // default ON
      return v === '1';
    })()
  );

  movementsEnabled$ = this.movementsEnabledSubject.asObservable();

  isMovementsEnabled(): boolean {
    return this.movementsEnabledSubject.value;
  }

  setMovementsEnabled(enabled: boolean) {
    this.movementsEnabledSubject.next(enabled);
    this.writeBool(this.STORAGE.movements, enabled);
  }

  toggleMovements() {
    this.setMovementsEnabled(!this.movementsEnabledSubject.value);
  }

  // 👉 los otros flags (usados en Config)
  isLowBalanceEnabled(): boolean {
    return this.readBool(this.STORAGE.lowBalance, true);
  }

  setLowBalanceEnabled(enabled: boolean) {
    this.writeBool(this.STORAGE.lowBalance, enabled);
  }

  isLimitReachedEnabled(): boolean {
    return this.readBool(this.STORAGE.limitReached, true);
  }

  setLimitReachedEnabled(enabled: boolean) {
    this.writeBool(this.STORAGE.limitReached, enabled);
  }

  isNewsEnabled(): boolean {
    return this.readBool(this.STORAGE.news, false);
  }

  setNewsEnabled(enabled: boolean) {
    this.writeBool(this.STORAGE.news, enabled);
  }

  // ====== FEEDBACK VISUAL (toasts reutilizables) ======

  async notify(
    kind: NotificationKind,
    message: string,
    opts?: { title?: string; durationMs?: number }
  ) {
    const colorMap: Record<NotificationKind, string> = {
      success: 'success',
      error: 'danger',
      warning: 'warning',
      info: 'primary',
    };

    const iconMap: Record<NotificationKind, string> = {
      success: 'checkmark-circle-outline',
      error: 'close-circle-outline',
      warning: 'warning-outline',
      info: 'alert-circle-outline',
    };

    const toast = await this.toastCtrl.create({
      header: opts?.title,
      message,
      duration: opts?.durationMs ?? 2500,
      color: colorMap[kind],
      icon: iconMap[kind],
      position: 'top',
      cssClass: `mk-toast mk-toast-${kind}`,
      buttons: [
        {
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }

  // helpers cómodos
  success(msg: string, opts?: { title?: string; durationMs?: number }) {
    return this.notify('success', msg, opts);
  }

  error(msg: string, opts?: { title?: string; durationMs?: number }) {
    return this.notify('error', msg, opts);
  }

  warning(msg: string, opts?: { title?: string; durationMs?: number }) {
    return this.notify('warning', msg, opts);
  }

  info(msg: string, opts?: { title?: string; durationMs?: number }) {
    return this.notify('info', msg, opts);
  }
}
