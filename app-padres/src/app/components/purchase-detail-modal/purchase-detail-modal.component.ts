import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, IonicModule } from '@ionic/angular';
import { ActivityItem } from '../../pages/activity/activity.page';
import { addIcons } from 'ionicons';
import { closeOutline, documentTextOutline } from 'ionicons/icons';

@Component({
  selector: 'app-purchase-detail-modal',
  standalone: true,
  templateUrl: './purchase-detail-modal.component.html',
  styleUrls: ['./purchase-detail-modal.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class PurchaseDetailModalComponent implements OnInit {
  @Input() transaction!: ActivityItem;
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, documentTextOutline });
  }

  ngOnInit() {
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
