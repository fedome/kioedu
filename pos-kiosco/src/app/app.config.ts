import { APP_INITIALIZER, ApplicationConfig, inject, LOCALE_ID, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { KioskConfigService } from './core/api/kiosk-config.service';

import { authInterceptor } from './core/auth/auth.interceptor';

registerLocaleData(localeEsAr);

import { SyncService } from './core/services/sync.service';
import { VersionService } from './core/services/version.service';

function initApp(cfg: KioskConfigService, sync: SyncService, version: VersionService) {
  return () => {
    sync.init();
    // No necesitamos llamar a nada específico de version, el constructor hace el trabajo
    return cfg.load();
  };
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: APP_INITIALIZER, useFactory: initApp, deps: [KioskConfigService, SyncService, VersionService], multi: true },
    { provide: LOCALE_ID, useValue: 'es-AR' }
  ],
};
