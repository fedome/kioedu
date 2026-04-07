import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface UiNotification {
  id: number;
  type: UiNotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, opcional
}

@Injectable({ providedIn: 'root' })
export class UiNotificationsService {
  private lastId = 0;
  private subject = new BehaviorSubject<UiNotification[]>([]);
  notifications$ = this.subject.asObservable();

  // ---------- API pública de alto nivel ----------

  success(title: string, message?: string, duration = 3000) {
    this.push({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration = 3000) {
    this.push({ type: 'error', title, message, duration });
  }

  warning(title: string, message?: string, duration = 3000) {
    this.push({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration = 3000) {
    this.push({ type: 'info', title, message, duration });
  }

  dismiss(id: number) {
    this.subject.next(this.subject.value.filter((n) => n.id !== id));
  }

  clear() {
    this.subject.next([]);
  }

  // ---------- Interno ----------

  private push(input: Omit<UiNotification, 'id'>) {
    const id = ++this.lastId;
    const notif: UiNotification = { ...input, id };
    const list = this.subject.value;

    this.subject.next([...list, notif]);

    const duration = input.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
}
