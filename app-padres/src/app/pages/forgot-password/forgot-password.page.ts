import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth/auth.service';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    addIcons({ mailOutline });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Enviando instrucciones...',
    });
    await loading.present();

    const { email } = this.form.value;
    
    this.authService.requestPasswordReset(email!).subscribe({
      next: async () => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Si el email existe, te enviamos instrucciones para recuperar la contraseña.',
          duration: 3500,
          color: 'success',
        });
        await toast.present();
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: async () => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'No se pudo procesar la solicitud. Intentalo de nuevo.',
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
