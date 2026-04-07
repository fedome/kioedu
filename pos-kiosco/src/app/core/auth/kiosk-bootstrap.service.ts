import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api/api.service';
import { KioskConfigService } from '../api/kiosk-config.service';
import type { KioskLoginResp } from '../../../types/kiosk-bridge';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KioskBootstrapService {
  private api = inject(ApiService);
  private kioskCfg = inject(KioskConfigService);

  private kioskTokenKey = 'kiosk_token';
  private kioskExpKey = 'kiosk_expiresAt';

  get kioskToken(): string | null {
    return sessionStorage.getItem(this.kioskTokenKey);
  }

  clear() {
    sessionStorage.removeItem(this.kioskTokenKey);
    sessionStorage.removeItem(this.kioskExpKey);
  }

  async ensureKioskToken(force = false): Promise<string> {
    if (force) this.clear();

    const token = this.kioskToken;
    const exp = sessionStorage.getItem(this.kioskExpKey);

    // 1. Si ya tenemos token válido en memoria, lo devolvemos
    if (token && exp) {
      const expMs = new Date(exp).getTime();
      if (Date.now() < expMs - 10_000) return token;
    }

    // 2. Intentamos obtener el puente de Electron
    const kioskBridge = (window as any).kiosk;

    // --- ESCENARIO A: ESTAMOS EN EL NAVEGADOR (CHROME/DEV) ---
    if (!kioskBridge?.login) {
      console.warn('⚠️ [DEV MODE] No se detectó Electron. Obteniendo Token con Auth real (API Key)...');

      // API Key desde la configuración dinámica (assets/kiosk.json) o fallback
      const apiKey = this.kioskCfg.current?.kioskApiKey || environment.kioskApiKey;

      try {
        const r = await firstValueFrom(
          this.api.post<KioskLoginResp>(
            '/pos/session/login',
            {},
            { headers: { 'x-kiosk-key': apiKey } }
          )
        );

        sessionStorage.setItem(this.kioskTokenKey, r.kiosk_token);
        sessionStorage.setItem(this.kioskExpKey, r.expiresAt);
        return r.kiosk_token;

      } catch (err) {
        console.error('❌ Error en DEV MODE obteniendo token:', err);
        throw err;
      }
    }

    // --- ESCENARIO B: ESTAMOS EN ELECTRON (PRODUCCIÓN) ---
    try {
      const r: KioskLoginResp = await kioskBridge.login();
      sessionStorage.setItem(this.kioskTokenKey, r.kiosk_token);
      sessionStorage.setItem(this.kioskExpKey, r.expiresAt);
      return r.kiosk_token;
    } catch (error) {
      console.error('❌ Error crítico obteniendo token de Kiosco:', error);
      throw error;
    }
  }
}
