import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonToggle,
  IonList
} from '@ionic/angular/standalone';

import { Router, RouterModule } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  settingsOutline,
  helpCircleOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  personCircleOutline,
  notificationsOutline,
  cardOutline,
  openSharp,
} from 'ionicons/icons';

import { AuthService } from 'src/app/services/auth/auth.service';
import { UserProfile } from 'src/app/interfaces/child.interface';
import { ThemeService } from '../../services/theme/theme';
import { NotificationsService } from '../../services/notification/notifications';
import { SupportModalComponent } from 'src/app/components/support-modal/support-modal.component';
import { NotificationsHistoryComponent } from "../../components/notifications-history/notifications-history.component";
import { NotificationsBellComponent } from 'src/app/components/notifications-bell/notifications-bell.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [
    CommonModule,
    RouterModule,

    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonToggle,
    IonList,
    NotificationsBellComponent,
  ],
})
export class SettingsPage implements OnInit {
  darkMode = false;
  profile: UserProfile | null = null;

  // Notificaciones
  notifyMovements = true;
  notifyLowBalance = true;
  notifyLimitReached = true;
  notifyNews = false;

  private STORAGE = {
    notifyMovements: 'mk-settings-notify-movements',
    notifyLowBalance: 'mk-settings-notify-low-balance',
    notifyLimitReached: 'mk-settings-notify-limit-reached',
    notifyNews: 'mk-settings-notify-news',
  } as const;

  constructor(
    private auth: AuthService,
    private alertCtrl: AlertController,
    private router: Router,
    private theme: ThemeService,
    private notifications: NotificationsService,
    private modalCtrl: ModalController,
  ) {
    addIcons({
      menuOutline,
      settingsOutline,
      helpCircleOutline,
      documentTextOutline,
      shieldCheckmarkOutline,
      personCircleOutline,
      notificationsOutline,
      cardOutline,
    });
  }

  ngOnInit() {
    this.loadProfile();
    this.darkMode = this.theme.isDarkMode();

    this.notifyMovements = this.notifications.isMovementsEnabled();
    this.notifyLowBalance = this.notifications.isLowBalanceEnabled();
    this.notifyLimitReached = this.notifications.isLimitReachedEnabled();
    this.notifyNews = this.notifications.isNewsEnabled();
  }

  private loadProfile() {
    this.auth.getProfile().subscribe({
      next: (p) => (this.profile = p),
      error: (err) => console.error('Error cargando perfil', err),
    });
  }

  // -------- Notificaciones --------

  onToggleChange(type: 'movements' | 'low' | 'limit' | 'news', ev: CustomEvent) {
    const checked = !!ev.detail.checked;

    switch (type) {
      case 'movements':
        this.notifyMovements = checked;
        this.notifications.setMovementsEnabled(checked);
        break;
      case 'low':
        this.notifyLowBalance = checked;
        this.notifications.setLowBalanceEnabled(checked);
        break;
      case 'limit':
        this.notifyLimitReached = checked;
        this.notifications.setLimitReachedEnabled(checked);
        break;
      case 'news':
        this.notifyNews = checked;
        this.notifications.setNewsEnabled(checked);
        break;
    }
  }

  // -------- Preferencias --------

  onDarkModeToggle(ev: CustomEvent) {
    const enabled = !!ev.detail.checked;
    this.darkMode = enabled;
    this.theme.setDarkMode(enabled);
  }

  // -------- Atajos / acciones --------

  goToChildren() {
    this.router.navigate(['/tabs/dashboard']);
  }

  goToProfile() {
    this.router.navigate(['/tabs/profile']);
  }

  async openTerms() {
    this.router.navigate(['/terms']);
  }

  async openPrivacy() {
    this.router.navigate(['/privacy']);
  }

  async openSupport() {
    const modal = await this.modalCtrl.create({
      component: SupportModalComponent,
      cssClass: 'auto-height-modal',
    });

    await modal.present();
  }

  async openNotificationsHistory() {
    const modal = await this.modalCtrl.create({
      component: NotificationsHistoryComponent,
      cssClass: 'auto-height-modal',
    });
    await modal.present();
  }

  protected readonly openSharp = openSharp;
}
