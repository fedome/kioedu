import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CashierAuthService } from '../../../core/auth/cashier-auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(CashierAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notifications = inject(NotificationService);

  token = signal<string | null>(null);
  isLoading = signal(false);

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token.set(params['token'] || null);
    });
  }

  async onSubmit() {
    if (this.resetForm.invalid || !this.token()) return;
    
    const { password, confirmPassword } = this.resetForm.value;
    if (password !== confirmPassword) {
      this.notifications.error('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      this.isLoading.set(true);
      await this.authService.resetPassword(this.token()!, password!);
      this.notifications.success('Éxito', 'Contraseña restablecida correctamente. Iniciá sesión con tu nueva contraseña.');
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.notifications.error('Error', err.error?.message || 'El enlace es inválido o ha expirado.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
