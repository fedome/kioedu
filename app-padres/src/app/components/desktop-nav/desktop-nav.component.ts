import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { 
  IonIcon, 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  timeOutline, 
  personOutline, 
  settingsOutline,
  logOutOutline,
  notificationsOutline
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-desktop-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonIcon,
  ],
  templateUrl: './desktop-nav.component.html',
  styleUrls: ['./desktop-nav.component.scss']
})
export class DesktopNavComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  public appPages = [
    { title: 'Inicio', url: '/tabs/dashboard', icon: homeOutline },
    { title: 'Actividad', url: '/tabs/activity', icon: timeOutline },
    { title: 'Perfil', url: '/tabs/profile', icon: personOutline },
    { title: 'Ajustes', url: '/tabs/settings', icon: settingsOutline },
  ];

  constructor() {
    addIcons({ 
      homeOutline, 
      timeOutline, 
      personOutline, 
      settingsOutline,
      logOutOutline,
      notificationsOutline
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
