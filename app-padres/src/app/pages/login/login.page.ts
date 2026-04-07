import { Component, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth/auth.service';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { PushService } from "../../services/push/push.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private ngZone = inject(NgZone);
  private push = inject(PushService);
  passwordVisible = false;
  showOnboarding = true;

  startLogin() {
    this.showOnboarding = false;
  }

  cancelLogin() {
    this.showOnboarding = true;
  }

  loginForm = this.fb.group({
    email: ['feagusdome@gmail.com', [Validators.required, Validators.email]],
    password: ['Fede2003', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    addIcons({ personOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  async onLogin() {
    if (this.loginForm.invalid) return;

    const loading = await this.loadingCtrl.create({ message: 'Ingresando...' });
    await loading.present();

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: async () => {
        await this.push.init();
        await loading.dismiss();
        console.log('Login exitoso. Navegando...');

        // --- ARREGLO: Forzar la navegación dentro de la zona de Angular ---
        this.ngZone.run(() => {
          console.log("entro al ngZone")
          this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
          /*this.router.navigate(['/tabs/dashboard'], { replaceUrl: true })
            .then(success => console.log('¿Navegación exitosa?', success))
            .catch(err => console.error('Error de navegación:', err));*/
        });
        // ---------------------------------------------------------------
      },
      error: async (err) => {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Credenciales inválidas',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  GoToRegister() {
    // Ajustá la ruta cuando tengas la página de registro
    this.router.navigate(['/register']);
  }

  ForgotPassword() {
    // Más adelante: modal o pantalla de recuperación
    this.router.navigate(['/forgot-password']);
    console.log('TODO: recuperar contraseña');
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  /*testNavigation() {
    console.log('Intentando navegar manualmente a /tabs/dashboard...');
    // Forzamos la ruta exacta que definimos en tu tabs.routes.ts
    this.router.navigate(['/tabs/dashboard']);
  }*/
}
