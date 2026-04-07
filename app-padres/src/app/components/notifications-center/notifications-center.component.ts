import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  warningOutline,
  alertCircleOutline,
  closeOutline,
} from 'ionicons/icons';

import {
  UiNotificationsService,
  UiNotification,
  UiNotificationType,
} from '../../services/notification/ui-notifications.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './notifications-center.component.html',
  styleUrls: ['./notifications-center.component.scss'],
})
export class NotificationsCenterComponent {
  private uiNotifications = inject(UiNotificationsService);

  // Lista reactiva de toasts que se muestran en la UI
  notifications$: Observable<UiNotification[]> =
    this.uiNotifications.notifications$;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      warningOutline,
      alertCircleOutline,
      closeOutline,
    });
  }

  iconFor(type: UiNotificationType): string {
    switch (type) {
      case 'success':
        return 'checkmark-circle-outline';
      case 'error':
        return 'close-circle-outline';
      case 'warning':
        return 'warning-outline';
      case 'info':
      default:
        return 'alert-circle-outline';
    }
  }

  dismiss(id: number) {
    this.uiNotifications.dismiss(id);
  }
}
