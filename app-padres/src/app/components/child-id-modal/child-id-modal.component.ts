import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonAvatar,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, shareOutline, printOutline } from 'ionicons/icons';
import { Child } from 'src/app/interfaces/child.interface';

@Component({
  selector: 'app-child-id-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonAvatar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Credencial Digital</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding ion-text-center card-content">
      <div class="id-card-container">
        <div class="id-card">
          <div class="card-header">
            <div class="logo">KioEdu</div>
            <div class="chip"></div>
          </div>
          
          <div class="card-body">
            <div class="avatar-container">
              <ion-avatar>
                <img src="https://ionicframework.com/docs/img/demos/avatar.svg" />
              </ion-avatar>
            </div>
            
            <div class="child-info">
              <h2 class="name">{{ child.firstName }} {{ child.lastName }}</h2>
              <p class="school">Instituto Educativo MiKiosco</p>
            </div>

            <div class="qr-container">
              <!-- Usaremos un placeholder elegante de QR -->
              <div class="qr-placeholder">
                <div class="qr-inner">
                  <div class="qr-row" *ngFor="let i of [1,2,3,4,5,6,7,8]">
                    <div class="qr-pixel" *ngFor="let j of [1,2,3,4,5,6,7,8]" 
                         [style.opacity]="Math.random() > 0.5 ? 1 : 0.1"></div>
                  </div>
                </div>
              </div>
              <p class="qr-hint">Escaneá este código en el kiosco</p>
            </div>
          </div>

          <div class="card-footer">
            <div class="id-number">ID #{{ child.id.toString().padStart(6, '0') }}</div>
            <div class="valid-thru">VÁLIDO 2025/26</div>
          </div>
        </div>
      </div>

      <div class="actions-container">
        <ion-button fill="clear" color="primary">
          <ion-icon name="share-outline" slot="start"></ion-icon>
          Compartir
        </ion-button>
        <ion-button fill="clear" color="primary">
          <ion-icon name="print-outline" slot="start"></ion-icon>
          Imprimir
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .card-content {
      --background: var(--mk-page-bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .id-card-container {
      perspective: 1000px;
      margin-top: 20px;
      width: 100%;
      max-width: 320px;
    }

    .id-card {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, #1e3a8a 100%);
      border-radius: 20px;
      padding: 24px;
      color: white;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
        transform: rotate(30deg);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .logo {
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: 0.5px;
      }

      .chip {
        width: 35px;
        height: 25px;
        background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
        border-radius: 4px;
      }
    }

    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;

      ion-avatar {
        width: 80px;
        height: 80px;
        border: 3px solid rgba(255,255,255,0.2);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      }
    }

    .child-info {
      margin-bottom: 24px;
      .name {
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0;
      }
      .school {
        font-size: 0.8rem;
        opacity: 0.8;
        margin: 4px 0 0;
      }
    }

    .qr-container {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 8px;

      .qr-placeholder {
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qr-pixel {
        width: 15px;
        height: 15px;
        background: #111;
        float: left;
      }

      .qr-hint {
        color: #111;
        margin: 8px 0 0;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
      }
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      font-size: 0.7rem;
      font-weight: 600;
      opacity: 0.7;
    }

    .actions-container {
      margin-top: 32px;
      display: flex;
      gap: 16px;
      justify-content: center;
    }
  `],
})
export class ChildIdModalComponent {
  @Input() child!: Child;
  private modalCtrl = inject(ModalController);
  Math = Math;

  constructor() {
    addIcons({ closeOutline, shareOutline, printOutline });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
