import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, IonicModule, ToastController } from '@ionic/angular';
import { Child } from '../../interfaces/child.interface';
import { ChildrenService } from '../../services/children/children.service';
import { addIcons } from 'ionicons';
import { closeOutline, swapHorizontalOutline } from 'ionicons/icons';

@Component({
  selector: 'app-transfer-modal',
  standalone: true,
  templateUrl: './transfer-modal.component.html',
  styleUrls: ['./transfer-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class TransferModalComponent implements OnInit {
  @Input() children!: Child[];
  
  transferForm: FormGroup;
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  private childrenService = inject(ChildrenService);
  private toastCtrl = inject(ToastController);

  loading = false;

  constructor() {
    addIcons({ closeOutline, swapHorizontalOutline });
    this.transferForm = this.fb.group({
      fromChildId: ['', Validators.required],
      toChildId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    if (this.children.length === 2) {
      this.transferForm.patchValue({
        fromChildId: this.children[0].id,
        toChildId: this.children[1].id
      });
    }
  }

  get fromChildBalance() {
    const id = this.transferForm.value.fromChildId;
    if (!id) return 0;
    const child = this.children.find(c => c.id === id);
    return (child?.accounts?.[0]?.balanceCents || 0) / 100;
  }

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data, data ? 'confirm' : 'cancel');
  }

  async submit() {
    if (this.transferForm.invalid) return;
    const { fromChildId, toChildId, amount } = this.transferForm.value;

    if (fromChildId === toChildId) {
      const toast = await this.toastCtrl.create({
        message: 'No podés transferir al mismo hijo',
        duration: 2500,
        color: 'warning'
      });
      return toast.present();
    }

    if (amount > this.fromChildBalance) {
      const toast = await this.toastCtrl.create({
        message: 'Saldo insuficiente',
        duration: 2500,
        color: 'warning'
      });
      return toast.present();
    }

    this.loading = true;
    this.childrenService.transfer(fromChildId, toChildId, amount * 100).subscribe({
      next: async () => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: 'Transferencia realizada con éxito',
          duration: 2500,
          color: 'success'
        });
        toast.present();
        this.dismiss({ success: true });
      },
      error: async (err) => {
        this.loading = false;
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Error al transferir',
          duration: 2500,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
}
