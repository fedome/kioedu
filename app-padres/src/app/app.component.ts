import { Component, inject } from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane
} from '@ionic/angular/standalone';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ThemeService } from "./services/theme/theme";
import { NotificationsCenterComponent } from "./components/notifications-center/notifications-center.component";
import { DesktopNavComponent } from "./components/desktop-nav/desktop-nav.component";
import { PushService } from "./services/push/push.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonApp,
    IonSplitPane,
    IonRouterOutlet,
    NotificationsCenterComponent,
    DesktopNavComponent,
    CommonModule
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private auth = inject(AuthService);
  private push = inject(PushService);

  showNav = false;

  constructor(private theme: ThemeService, private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const authPages = ['/login', '/register', '/forgot-password', '/welcome', '/'];
      const currentUrl = event.urlAfterRedirects.split('?')[0];
      this.showNav = !authPages.includes(currentUrl);
    });
  }

  async ngOnInit() {
    if (this.auth.isLoggedIn()) {
      await this.push.init()
        .catch((err: any) => console.error('[Push] Error en init()', err));
    }
  }
}
