import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth/auth.service';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  passwordVisible = false;
  confirmPasswordVisible = false;

  form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [RegisterPage.passwordsMatchValidator] },
  );

  constructor() {
    addIcons({
      personOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  static passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!pass || !confirm) return null;
    return pass === confirm ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
    });
    await loading.present();

    const { fullName, email, password } = this.form.value;

    this.authService
      .registerParent({
        name: fullName?.trim() || '',
        email: email?.trim().toLowerCase() || '',
        password: password!,
      })
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const toast = await this.toastCtrl.create({
            message: 'Cuenta creada. Ahora podés iniciar sesión.',
            duration: 2500,
            color: 'success',
          });
          await toast.present();
          this.router.navigate(['/login'], { replaceUrl: true });
        },
        error: async (err: { error: { message: string; }; }) => {
          await loading.dismiss();
          const message =
            err?.error?.message || 'No se pudo crear la cuenta. Intentalo de nuevo.';
          const toast = await this.toastCtrl.create({
            message,
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
