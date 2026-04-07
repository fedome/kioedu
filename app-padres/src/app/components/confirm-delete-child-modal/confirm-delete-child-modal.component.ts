import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Child } from 'src/app/interfaces/child.interface';

@Component({
  selector: 'app-confirm-delete-child-modal',
  standalone: true,
  templateUrl: './confirm-delete-child-modal.component.html',
  styleUrls: ['./confirm-delete-child-modal.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class ConfirmDeleteChildModalComponent {
  @Input() child!: Child;

  private modalCtrl = inject(ModalController);

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    this.modalCtrl.dismiss(
      { childId: this.child.id },
      'confirm'
    );
  }
}
