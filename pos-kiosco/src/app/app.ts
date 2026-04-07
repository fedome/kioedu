import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarcodeService } from './core/services/barcode.service';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Inicializar el servicio de códigos de barras globalmente
  private barcodeService = inject(BarcodeService);
}

