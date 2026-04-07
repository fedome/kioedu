import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { homeOutline, timeOutline, personOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel
  ]
})
export class TabsPage {
  private router = inject(Router);
  private lastTab = 'dashboard';

  constructor() {
    addIcons({ homeOutline, timeOutline, personOutline });
  }

  /**
   * Cuando el usuario vuelve al tab "dashboard" desde otro tab,
   * reseteamos la navegación al root del dashboard para que no
   * quede atrapado en child-profile u otra sub-página.
   */
  onTabChange(event: { tab: string }) {
    const targetTab = event.tab;

    // Si estamos volviendo al dashboard desde otro tab
    if (targetTab === 'dashboard' && this.lastTab !== 'dashboard') {
      // Si estamos en una sub-ruta del dashboard (ej: child/:id), navegar al root
      const currentUrl = this.router.url;
      if (currentUrl.includes('/dashboard/child/')) {
        this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
      }
    }

    this.lastTab = targetTab;
  }
}
