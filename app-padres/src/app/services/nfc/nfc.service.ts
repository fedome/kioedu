import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  NFC,
  NDEFMessagesTransformable,
  NFCError,
} from '@exxili/capacitor-nfc';

import { UiNotificationsService } from '../notification/ui-notifications.service';

@Injectable({ providedIn: 'root' })
export class NfcService {

  private isListening = false;
  private offRead?: () => void;
  private offError?: () => void;

  constructor(private uiNotifications: UiNotificationsService) {}

  /**
   * Lee una tarjeta NFC UNA sola vez y devuelve el UID como string (hex)
   */
  async readCardUidOnce(): Promise<string | null> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      this.uiNotifications.info(
        'NFC no disponible',
        'Para leer la tarjeta, usá la app desde tu celular.'
      );
      return null;
    }

    // 1) Ver si está soportado
    const { supported } = await NFC.isSupported();
    if (!supported) {
      this.uiNotifications.warning(
        'NFC no soportado',
        'Este dispositivo no tiene NFC o está desactivado.'
      );
      return null;
    }

    return new Promise<string | null>(async (resolve) => {
      // Limpieza por si acaso
      this.cleanupListeners();

      this.uiNotifications.info(
        'Acercá la tarjeta',
        'Acercá la tarjeta al celular para leer el código.'
      );

      this.isListening = true;

      // 2) Listener de lectura
      this.offRead = NFC.onRead((data: NDEFMessagesTransformable) => {
        const asString = data.string();
        const uid = asString.tagInfo?.uid;

        this.cleanupListeners();

        if (!uid) {
          this.uiNotifications.error(
            'No se pudo leer la tarjeta',
            'Probá nuevamente apoyando la tarjeta un poco más.'
          );
          resolve(null);
          return;
        }

        const normalized = uid.toUpperCase();
        this.uiNotifications.success(
          'Tarjeta detectada',
          `Código leído: ${normalized}`
        );

        resolve(normalized);
      });

      // 3) Listener de error
      this.offError = NFC.onError((err: NFCError) => {
        console.error('[NFC] Error:', err);
        this.cleanupListeners();

        this.uiNotifications.error(
          'Error al leer la tarjeta',
          err?.error ?? 'Probá nuevamente.'
        );

        resolve(null);
      });

      // 4) En iOS hay que iniciar el scan
      if (platform === 'ios') {
        try {
          await NFC.startScan();
        } catch (e) {
          console.error('[NFC] Error al iniciar scan', e);
          this.cleanupListeners();
          this.uiNotifications.error(
            'No se pudo iniciar el lector NFC',
            'Revisá los permisos o probá de nuevo.'
          );
          resolve(null);
        }
      }
      // En Android no hace falta llamar a startScan: está escuchando en foreground.
    });
  }

  private cleanupListeners() {
    if (this.offRead) {
      this.offRead();
      this.offRead = undefined;
    }
    if (this.offError) {
      this.offError();
      this.offError = undefined;
    }
    this.isListening = false;

    // iOS: por las dudas, cancelar sesión
    NFC.cancelScan().catch(() => {});
  }
}
