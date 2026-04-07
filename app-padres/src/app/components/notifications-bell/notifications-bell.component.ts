import { Component, inject } from '@angular/core';
import {
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  notificationsOffOutline,
} from 'ionicons/icons';
import { NotificationsService } from '../../services/notification/notifications';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [CommonModule, IonButtons, IonButton, IonIcon],
  template: `
    <ion-buttons slot="end">
      <ion-button fill="clear" size="small" (click)="toggle()">
        <ion-icon
          [name]="(enabled$ | async) ? 'notifications-outline' : 'notifications-off-outline'">
        </ion-icon>
      </ion-button>
    </ion-buttons>
  `,
})
export class NotificationsBellComponent {
  private notifications = inject(NotificationsService);

  enabled$: Observable<boolean> = this.notifications.movementsEnabled$;

  constructor() {
    addIcons({ notificationsOutline, notificationsOffOutline });
  }

  toggle() {
    this.notifications.toggleMovements();
  }
}
