import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Child } from 'src/app/interfaces/child.interface';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-child-selection-modal',
  templateUrl: './child-selection-modal.component.html',
  styleUrls: ['./child-selection-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ChildSelectionModalComponent {
  private modalCtrl = inject(ModalController);
  @Input() children: Child[] = [];

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  selectChild(child: Child) {
    this.modalCtrl.dismiss(child, 'confirm');
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
