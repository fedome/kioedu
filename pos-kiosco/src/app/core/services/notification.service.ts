import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private counter = 0;

    // Lista de notificaciones activas
    notifications = signal<ToastNotification[]>([]);

    // Mostrar notificación de stock bajo
    showLowStockAlert(productName: string, currentStock: number) {
        this.show({
            type: 'warning',
            title: '⚠️ Stock Bajo',
            message: `${productName}: quedan ${currentStock} unidades`,
            duration: 5000
        });
    }

    // Mostrar notificación genérica
    show(config: Omit<ToastNotification, 'id'>) {
        const notification: ToastNotification = {
            ...config,
            id: ++this.counter,
            duration: config.duration ?? 4000
        };

        this.notifications.update(list => [...list, notification]);

        // Auto-remover después del tiempo especificado
        const duration = notification.duration ?? 4000;
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, duration);
        }
    }

    // Métodos de conveniencia
    success(title: string, message: string) {
        this.show({ type: 'success', title, message });
    }

    error(title: string, message: string) {
        this.show({ type: 'error', title, message, duration: 6000 });
    }

    warning(title: string, message: string) {
        this.show({ type: 'warning', title, message });
    }

    info(title: string, message: string) {
        this.show({ type: 'info', title, message });
    }

    // Remover notificación
    remove(id: number) {
        this.notifications.update(list => list.filter(n => n.id !== id));
    }

    // Limpiar todas
    clearAll() {
        this.notifications.set([]);
    }
}
