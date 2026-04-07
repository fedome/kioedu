import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';
import { interval, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class UiService implements OnDestroy {
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  title = signal<string>('Dashboard');
  subtitle = signal<string>('Bienvenido al turno de hoy');

  isOnline = signal<boolean>(true);

  // --- NUEVO: Estado de la Caja ---
  isSessionOpen = signal<boolean>(false);

  private statusSubscription: Subscription;

  constructor() {
    // Chequeo inicial
    this.checkBackendStatus();

    // Polling cada 10 segundos para ver si sigue online y el estado de la caja
    this.statusSubscription = interval(10000).subscribe(() => {
      this.checkBackendStatus();
    });
  }

  setPageTitle(main: string, sub: string = '') {
    this.title.set(main);
    this.subtitle.set(sub);
  }

  checkBackendStatus() {
    // Usamos el endpoint de summary para matar dos pájaros de un tiro:
    // 1. Si responde, estamos Online.
    // 2. Si responde 200, la caja está abierta. Si responde 404, cerrada.
    this.api.get('/cash-sessions/summary').pipe(first()).subscribe({
      next: (res) => {
        this.isOnline.set(true);
        this.isSessionOpen.set(true); // Respondio OK -> Caja Abierta
      },
      error: (err) => {
        if (err.status === 404) {
          this.isOnline.set(true); // Responde el server, pero dice "No found" -> Caja Cerrada
          this.isSessionOpen.set(false);
        } else if (err.status === 0 || err.status === 503) {
          this.isOnline.set(false); // No responde -> Offline
        }
      }
    });
  }

  showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'success') {
    this.notifications.show({
      type,
      title: type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Aviso',
      message
    });
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }
}
