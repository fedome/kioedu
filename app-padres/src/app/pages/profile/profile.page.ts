import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonAvatar,
  IonItem,
  IonLabel,
  IonToggle,
  IonInput,
} from '@ionic/angular/standalone';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
} from '@angular/forms';

import { IonicModule, MenuController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  notificationsOutline,
  notificationsOffOutline,
  moonOutline,
} from 'ionicons/icons';

import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth/auth.service';
import { UserProfile } from 'src/app/interfaces/child.interface';
import { NotificationsBellComponent } from 'src/app/components/notifications-bell/notifications-bell.component';
import { NotificationsService } from 'src/app/services/notification/notifications';
import { ThemeService } from 'src/app/services/theme/theme';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonAvatar,
    IonItem,
    IonLabel,
    IonToggle,
    IonInput,
    NotificationsBellComponent,

  ],
})
export class ProfilePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private notifications = inject(NotificationsService);
  private themeService = inject(ThemeService);
  profile: UserProfile | null = null;
  movementsEnabled$ = this.notifications.movementsEnabled$;
  isDarkMode = false;


  changingPassword = false;
  changePasswordForm: FormGroup;

  constructor() {
    addIcons({
      menuOutline,
      notificationsOutline,
      notificationsOffOutline,
      moonOutline,
    });

    this.changePasswordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordsMatchValidator },
    );
  }

  ngOnInit() {
    this.loadProfile();
    this.checkDarkMode();
  }

  // ---------- Tema Oscuro ----------
  checkDarkMode() {
    this.isDarkMode = this.themeService.isDarkMode();
  }

  toggleDarkMode(event: any) {
    this.isDarkMode = event.detail.checked;
    this.themeService.setDarkMode(this.isDarkMode);
  }

  // ---------- Perfil ----------

  private loadProfile() {
    this.auth.getProfile().subscribe({
      next: (p) => (this.profile = p),
      error: (err) => console.error('Error cargando perfil', err),
    });
  }

  get initials(): string {
    if (!this.profile?.name) return 'ME';
    const parts = this.profile.name.split(' ').filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  getRoleLabel(role?: string | null): string {
    if (!role) return '';
    if (role === 'PARENT') return 'Padre';
    if (role === 'CASHIER') return 'Cajero';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'ENCARGADO') return 'Encargado';
    return role;
  }

  // ---------- Notificaciones ----------

  onMovementsToggle(ev: CustomEvent) {
    const checked = !!ev.detail.checked;
    this.notifications.setMovementsEnabled(checked);
  }


  private getStoredNotifications(): boolean {
    const value = localStorage.getItem('mk-parent-notifications-enabled');
    if (value === null) return true;
    return value === '1';
  }

  // ---------- Logout ----------

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // ---------- Cambio de contraseña (inline) ----------

  get passwordMismatch(): boolean {
    return !!this.changePasswordForm.errors?.['passwordMismatch'];
  }

  toggleChangePassword() {
    this.changingPassword = !this.changingPassword;

    // Si cancela, reseteamos el form
    if (!this.changingPassword) {
      this.changePasswordForm.reset();
    }
  }

  async submitChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.changePasswordForm.value;

    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Contraseña actualizada correctamente.',
          duration: 2500,
          color: 'success',
        });
        await toast.present();
        this.changePasswordForm.reset();
        this.changingPassword = false;
      },
      error: async (err) => {
        const message = err?.error?.message || 'No se pudo cambiar la contraseña. Verificá la contraseña actual.';
        const toast = await this.toastCtrl.create({
          message,
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }


  get childrenCount(): number {
    return this.profile?.children?.length ?? 0;
  }

  get hasChildren(): boolean {
    return this.childrenCount > 0;
  }

  // --- Soporte ---

  async onContactSupport() {
    const alert = await this.alertCtrl.create({
      header: 'Contactar Soporte',
      message: 'Elegí cómo querés comunicarte con nosotros:',
      mode: 'ios',
      buttons: [
        {
          text: 'WhatsApp',
          handler: () => {
            // Cambiá el número por el real de soporte
            window.open('https://wa.me/5491162558127?text=Hola,%20necesito%20ayuda%20con%20mi%20cuenta%20de%20Kio', '_blank');
          }
        },
        {
          text: 'Email',
          handler: () => {
            window.open('mailto:soporte@kio.app?subject=Consulta%20desde%20la%20app', '_blank');
          }
        },
        {
          text: 'Llamar',
          handler: () => {
            window.open('tel:+5491162558127', '_system');
          }
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });

    await alert.present();
  }


}

// Validador cross-field
function passwordsMatchValidator(group: FormGroup): ValidationErrors | null {
  const newPass = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!newPass || !confirm) return null;
  return newPass === confirm ? null : { passwordMismatch: true };
}
