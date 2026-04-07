import {Component, EventEmitter, Output, inject, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/api/api.service';
import {CashierAuthService} from '../../../../core/auth/cashier-auth.service';
import {Router} from '@angular/router';
import {UiService} from '../../../../core/services/ui.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-open-session-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './open-session-modal.html',
  styleUrls: ['./open-session-modal.scss']
})
export class OpenSessionModalComponent {
  @Output() sessionOpened = new EventEmitter<void>();


  private api = inject(ApiService);
  private auth = inject(CashierAuthService);
  private router = inject(Router);
  private ui = inject(UiService);
  private notifications = inject(NotificationService);

  amount: number = 0;
  loading = false;




  cashierName = computed(() => this.auth.currentUser()?.name || 'Cajero');



  confirmOpen() {
    if (this.amount < 0) return;
    this.loading = true;

    const payload = {
      openingFloat: Math.round(this.amount * 100),
      openingNote: 'Apertura Web'
    };

    this.api.post('/cash-sessions/open', payload).subscribe({
      next: () => {
        this.sessionOpened.emit();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.notifications.error('Error', 'Error al abrir caja: ' + (err.error?.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

}
