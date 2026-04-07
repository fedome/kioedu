import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { NotificationService } from './notification.service';
import { ConfirmService } from './confirm.service';

@Injectable({
    providedIn: 'root'
})
export class VersionService {
    private swUpdate = inject(SwUpdate);
    private notifications = inject(NotificationService);
    private confirmService = inject(ConfirmService);

    constructor() {
        if (this.swUpdate.isEnabled) {
            console.log('👷 PWA Update Service enabled');

            this.swUpdate.versionUpdates
                .pipe(
                    filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
                )
                .subscribe(evt => {
                    console.log(`🚀 New version available: ${evt.currentVersion} -> ${evt.latestVersion}`);
                    this.showUpdateNotification();
                });
        }
    }

    private async showUpdateNotification() {
        // Usamos una notificación que el usuario pueda interactuar
        const confirmed = await this.confirmService.confirm({
            title: 'Actualización Disponible',
            message: 'Hay una nueva versión de la aplicación disponible. ¿Deseas actualizar ahora?',
            confirmText: 'Actualizar',
            type: 'primary'
        });
        if (confirmed) {
            this.activateUpdate();
        }
    }

    public activateUpdate() {
        this.swUpdate.activateUpdate().then(() => {
            document.location.reload();
        });
    }

    // Permite checkeo manual
    public checkForUpdate() {
        if (this.swUpdate.isEnabled) {
            this.swUpdate.checkForUpdate();
        }
    }
}
