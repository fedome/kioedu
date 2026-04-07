// src/app/components/notifications-history/notifications-history.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import {
  NotificationHistoryService,
  HistoryNotification,
  HistoryNotificationKind,
} from '../../services/notification/notification-history.service';
import { Subscription } from 'rxjs';

type SegmentValue = 'ALL' | 'ACCOUNT' | 'NEWS';

@Component({
  selector: 'app-notifications-history',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
  ],
  templateUrl: './notifications-history.component.html',
  styleUrls: ['./notifications-history.component.scss'],
})
export class NotificationsHistoryComponent implements OnInit, OnDestroy {
  segment: SegmentValue = 'ALL';

  notifications: HistoryNotification[] = [];
  filteredNotifications: HistoryNotification[] = [];
  unreadCount = 0;

  private sub?: Subscription;

  constructor(private history: NotificationHistoryService) {}

  ngOnInit() {
    this.sub = this.history.notifications$.subscribe((list: HistoryNotification[]) => {
      this.notifications = list;
      this.unreadCount = list.filter((n: { read: any; }) => !n.read).length;
      this.applyFilter();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onSegmentChange(ev: CustomEvent) {
    this.segment = ev.detail.value as SegmentValue;
    this.applyFilter();
  }

  private applyFilter() {
    if (this.segment === 'ALL') {
      this.filteredNotifications = this.notifications;
      return;
    }

    const accountKinds: HistoryNotificationKind[] = [
      'MOVEMENT',
      'LOW_BALANCE',
      'LIMIT_REACHED',
    ];

    if (this.segment === 'ACCOUNT') {
      this.filteredNotifications = this.notifications.filter((n) =>
        accountKinds.includes(n.kind),
      );
    } else if (this.segment === 'NEWS') {
      this.filteredNotifications = this.notifications.filter(
        (n) => n.kind === 'NEWS',
      );
    }
  }

  iconFor(n: HistoryNotification): string {
    switch (n.kind) {
      case 'MOVEMENT':
        return 'card-outline';
      case 'LOW_BALANCE':
        return 'wallet-outline';
      case 'LIMIT_REACHED':
        return 'alert-circle-outline';
      case 'NEWS':
      default:
        return 'megaphone-outline';
    }
  }

  pillLabel(n: HistoryNotification): string {
    switch (n.kind) {
      case 'MOVEMENT':
        return 'Movimiento';
      case 'LOW_BALANCE':
        return 'Saldo bajo';
      case 'LIMIT_REACHED':
        return 'Límite diario';
      case 'NEWS':
        return 'Novedades';
      default:
        return '';
    }
  }

  markAsRead(n: HistoryNotification) {
    if (!n.read) this.history.markAsRead(n.id);
  }

  remove(n: HistoryNotification) {
    this.history.remove(n.id);
  }

  markAllAsRead() {
    this.history.markAllAsRead();
  }

  clearAll() {
    this.history.clear();
  }
}
