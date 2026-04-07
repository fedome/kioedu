import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { KioskConfig } from '../../../types/kiosk-bridge';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KioskConfigService {
  private cfg: KioskConfig | null = null;
  private http = inject(HttpClient);

  async load(): Promise<void> {
    // Electron
    if (window.kiosk?.getConfig) {
      this.cfg = await window.kiosk.getConfig();
      return;
    }

    // Browser fallback: try assets/kiosk.json first (runtime config),
    // then fall back to environment.ts (compile-time default)
    try {
      const fileCfg = await firstValueFrom(
        this.http.get<KioskConfig>('/assets/kiosk.json')
      );
      if (fileCfg?.apiBaseUrl) {
        this.cfg = fileCfg;
        return;
      }
    } catch {
      // No kiosk.json available, using environment fallback
    }

    this.cfg = { apiBaseUrl: environment.apiBaseUrl };
  }

  get required(): KioskConfig {
    if (!this.cfg?.apiBaseUrl) {
      throw new Error('Kiosk config missing (apiBaseUrl).');
    }
    return this.cfg;
  }

  get current(): KioskConfig | null {
    return this.cfg;
  }
}
