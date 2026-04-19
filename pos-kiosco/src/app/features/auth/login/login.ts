import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CashierAuthService } from '../../../core/auth/cashier-auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html', // Referencia al HTML con Tailwind
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(CashierAuthService);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private notifications = inject(NotificationService);

  // Estados reactivos (Signals)
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [true] // Por defecto activado para el kiosquero
  });


  togglePassword() {
    this.showPassword.update(val => !val);
  }

  async onForgotPassword() {
    const email = await this.confirmService.prompt({
      title: 'Recuperar Contraseña',
      message: 'Ingresá tu correo electrónico para enviarte las instrucciones de recuperación.',
      inputPlaceholder: 'tucorreo@escuela.com',
      confirmText: 'Enviar link',
      cancelText: 'Cancelar',
      type: 'warning' // or info, KioEdu usually uses warning for alerts
    });

    if (email && email.trim() !== '') {
      try {
        this.isLoading.set(true);
        const resp = await this.authService.forgotPassword(email.trim());
        this.notifications.success('Solicitud enviada', resp.message || 'Si el correo existe, recibirás un link de recuperación en breve.');
      } catch (err: any) {
        this.notifications.error('Error', err.error?.message || 'Hubo un problema al procesar la solicitud.');
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  // --- SECRET WIPE DATA ---
  private logoClicks = 0;
  private clickTimeout: any;

  onLogoClick() {
    this.logoClicks++;

    // Resetear contador si pasa mucho tiempo entre clicks
    clearTimeout(this.clickTimeout);
    this.clickTimeout = setTimeout(() => this.logoClicks = 0, 2000);

    if (this.logoClicks >= 5) {
      this.logoClicks = 0;
      this.triggerWipeFlow();
    }
  }

  private async triggerWipeFlow() {
    // PIN dinámico: día del mes * 17 + 42 (cambia cada día)
    const dynamicPin = String(new Date().getDate() * 17 + 42);
    
    const input = await this.confirmService.prompt({
      title: '⚠️ ZONA DE PELIGRO ⚠️',
      message: 'Estás a punto de borrar TODOS los datos del dispositivo. Para confirmar, ingresa el PIN del día:',
      inputPlaceholder: 'PIN del día...',
      confirmText: 'Verificar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (input === dynamicPin) {
      const ok = await this.confirmService.confirm({
        title: 'Confirmación Final',
        message: 'Última oportunidad. ¿Borrar base de datos y reiniciar?',
        confirmText: 'Sí, borrar todo',
        type: 'danger'
      });
      if (ok) {
        this.authService.logout(true);
      }
    } else if (input !== null) {
      this.notifications.error('Error', '⛔ PIN Incorrecto.');
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      await this.authService.login(email!, password!, !!rememberMe);

      // Navegar al Dashboard
      this.router.navigate(['/home']);
    } catch (err: any) {
      console.error('Login error', err);
      // Mensaje amigable si es 401
      if (err.status === 401) {
        this.errorMessage.set('Usuario o contraseña incorrectos.');
      } else {
        this.errorMessage.set('Error de conexión con el servidor.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
