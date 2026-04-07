import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CheckCircle, AlertTriangle, Info, XCircle, X, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        CheckCircle,
        AlertTriangle,
        Info,
        XCircle,
        X
      })
    }
  ],
  template: `
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (notification of notifications(); track notification.id) {
        <div
          class="pointer-events-auto min-w-[320px] max-w-md w-full p-4 rounded-xl shadow-lg border animate-slide-in cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-4"
          [ngClass]="getNotificationClasses(notification.type)"
          (click)="dismiss(notification.id)"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (notification.type) {
              @case ('success') { <lucide-icon name="check-circle" [size]="24" class="text-green-600"></lucide-icon> }
              @case ('error') { <lucide-icon name="x-circle" [size]="24" class="text-red-600"></lucide-icon> }
              @case ('warning') { <lucide-icon name="alert-triangle" [size]="24" class="text-amber-600"></lucide-icon> }
              @case ('info') { <lucide-icon name="info" [size]="24" class="text-blue-600"></lucide-icon> }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-base leading-tight" [ngClass]="getTitleClasses(notification.type)">
              {{ notification.title }}
            </h3>
            <p class="text-sm mt-1 opacity-90 leading-snug" [ngClass]="getMessageClasses(notification.type)">
              {{ notification.message }}
            </p>
          </div>

          <!-- Close Button -->
          <button class="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity" (click)="dismiss(notification.id); $event.stopPropagation()">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class ToastContainerComponent {
  private notificationService = inject(NotificationService);

  readonly CheckCircle = CheckCircle;
  readonly AlertTriangle = AlertTriangle;
  readonly Info = Info;
  readonly XCircle = XCircle;
  readonly X = X;

  notifications = this.notificationService.notifications;

  getNotificationClasses(type: string): object {
    return {
      'bg-green-50 border-green-200': type === 'success',
      'bg-red-50 border-red-200': type === 'error',
      'bg-amber-50 border-amber-200': type === 'warning',
      'bg-blue-50 border-blue-200': type === 'info'
    };
  }

  getTitleClasses(type: string): object {
    return {
      'text-green-800': type === 'success',
      'text-red-800': type === 'error',
      'text-amber-800': type === 'warning',
      'text-blue-800': type === 'info'
    };
  }

  getMessageClasses(type: string): object {
    return {
      'text-green-700': type === 'success',
      'text-red-700': type === 'error',
      'text-amber-700': type === 'warning',
      'text-blue-700': type === 'info'
    };
  }

  dismiss(id: number) {
    this.notificationService.remove(id);
  }
}
