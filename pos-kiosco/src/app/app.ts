import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarcodeService } from './core/services/barcode.service';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmModalComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Inicializar el servicio de códigos de barras globalmente
  private barcodeService = inject(BarcodeService);
}

