import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserProfile } from 'src/app/interfaces/child.interface';

@Component({
  selector: 'app-support-modal',
  standalone: true,
  templateUrl: './support-modal.component.html',
  styleUrls: ['./support-modal.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class SupportModalComponent {
  @Input() profile: UserProfile | null = null;

  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    contact: ['', [Validators.required]],          // mail o teléfono
    topic: ['general', [Validators.required]],     // tipo de consulta
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit() {
    // Prefill con datos del perfil si existen
    if (this.profile?.name || this.profile?.email) {
      this.form.patchValue({
        name: this.profile.name ?? '',
        contact: this.profile.email ?? '',
      });
    }
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, contact, topic, message } = this.form.value;

    const topicLabel = this.mapTopicLabel(topic);
    const subject = encodeURIComponent(
      `[App Padres] ${topicLabel} - ${name}`
    );

    const bodyLines = [
      `Nombre: ${name}`,
      `Contacto: ${contact}`,
      `Tema: ${topicLabel}`,
      '',
      'Detalle:',
      message,
    ];

    const body = encodeURIComponent(bodyLines.join('\n'));

    // Cambiá este mail por el real
    const mailTo = `mailto:soporte@KioEdu.com?subject=${subject}&body=${body}`;
    window.location.href = mailTo;

    this.modalCtrl.dismiss({ sent: true }, 'confirm');
  }

  mapTopicLabel(topic: string): string {
    switch (topic) {
      case 'access':
        return 'Problemas de acceso / login';
      case 'balance':
        return 'Saldo o recargas';
      case 'cards':
        return 'Tarjetas / activación';
      case 'suggestion':
        return 'Sugerencia / mejora';
      default:
        return 'Consulta general';
    }
  }

  hasError(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!c && c.touched && c.hasError(error);
  }
}
