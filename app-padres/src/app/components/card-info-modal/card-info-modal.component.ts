import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  keyOutline,
  storefrontOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { Child } from 'src/app/interfaces/child.interface';

export type CardActivationAction = 'nfc' | 'code' | 'kiosk';

export interface CardInfoModalResult {
  action: CardActivationAction;
  autoScan?: boolean;
}

@Component({
  selector: 'app-card-info-modal',
  standalone: true,
  templateUrl: './card-info-modal.component.html',
  styleUrls: ['./card-info-modal.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class CardInfoModalComponent {
  @Input() child!: Child;

  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({
      wifiOutline,
      keyOutline,
      storefrontOutline,
      chevronForwardOutline,
    });
  }

  selectOption(action: CardActivationAction) {
    const data: CardInfoModalResult = {
      action,
      autoScan: action === 'nfc',
    };

    this.modalCtrl.dismiss(data, 'confirm');
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  get firstName(): string {
    return this.child?.firstName ?? 'tu hijo';
  }
}
