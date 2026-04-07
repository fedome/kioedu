import { Component, inject } from '@angular/core';
import {
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ThemeService } from "./services/theme/theme";
import { NotificationsCenterComponent } from "./components/notifications-center/notifications-center.component";
import { PushService } from "./services/push/push.service";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    IonRouterOutlet,
    NotificationsCenterComponent,
  ],
})
export class AppComponent {
  private auth = inject(AuthService);
  private push = inject(PushService);

  constructor(private theme: ThemeService) {}

  async ngOnInit() {
    if (this.auth.isLoggedIn()) {
      await this.push.init()
        .catch(err => console.error('[Push] Error en init()', err));
    }
  }
}
