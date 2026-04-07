import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';

import { UiNotificationsService } from '../notification/ui-notifications.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {NotificationHistoryService} from "../notification/notification-history.service";

@Injectable({ providedIn: 'root' })
export class PushService {
  private initialized = false;
  //private history: NotificationHistoryService,

  constructor(
    private uiNotifications: UiNotificationsService,
    private http: HttpClient,
  ) {}

  async init() {
    if (this.initialized) {
      return;
    }

    // Solo en dispositivo nativo (Android / iOS), no en web
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      console.log('[Push] Web detectado, no inicializo push');
      return;
    }

    console.log('[Push] Inicializando push para plataforma:', platform);

    // 1) Permisos
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== 'granted') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permiso de notificaciones NO concedido');
      return;
    }

    // 2) Registro para obtener el token
    await PushNotifications.register();

    // 3) Listeners

    // ✅ Token de registro: lo mandamos al backend
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[Push] Token de registro:', token.value);

      this.registerTokenInBackend(token.value).catch((err) => {
        console.error('[Push] Error registrando token en backend', err);
        this.uiNotifications.error(
          'Error al registrar el dispositivo',
          'No pudimos guardar tu dispositivo para notificaciones.',
        );
      });
    });

    // Error al registrar
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Error en registro de push', err);
      this.uiNotifications.error(
        'Error con las notificaciones',
        'No se pudieron activar las notificaciones en este dispositivo.',
      );
    });

    // Notificación recibida con la app abierta (foreground)
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[Push] Notificación recibida', notification);

        this.uiNotifications.info(
          notification.title ?? 'Nueva notificación',
          notification.body,
        );
      },
    );

    // Usuario toca la notificación en la bandeja (background)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[Push] Acción sobre notificación', action);
        // Más adelante: navegar según action.notification.data
      },
    );

    this.initialized = true;
  }

  // 👇 AHORA SÍ: método privado de la clase, NO dentro de init()
  private async registerTokenInBackend(token: string) {
    const platform: 'android' | 'ios' | 'web' =
      (Capacitor.getPlatform() as any) || 'android';

    await this.http
      .post(`${environment.apiUrl}/notifications/device-tokens`, {
        token,
        platform,
      })
      .toPromise();

    console.log('[Push] Token enviado al backend correctamente.');
  }
}
