import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { environment } from "./environments/environment";
import { enableProdMode } from "@angular/core";
import { authInterceptor } from "./app/interceptors/auth.interceptor";
import {
  ModalController,
  AlertController,
  ToastController,
  ActionSheetController,
} from '@ionic/angular';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    ModalController,
    AlertController,
    ToastController,
    ActionSheetController,
  ],
});
