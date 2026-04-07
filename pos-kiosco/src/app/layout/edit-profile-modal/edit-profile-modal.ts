import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashierAuthService, CashierUser } from '../../core/auth/cashier-auth.service';

@Component({
    selector: 'app-edit-profile-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './edit-profile-modal.html'
})
export class EditProfileModalComponent {
    private auth = inject(CashierAuthService);

    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();

    // Campos del formulario
    name = '';
    email = '';

    // Estado
    isSaving = signal(false);
    errorMessage = signal('');

    ngOnChanges() {
        if (this.isOpen) {
            // Cargar datos actuales del usuario al abrir
            const user = this.auth.currentUser();
            if (user) {
                this.name = user.name;
                this.email = user.email;
            }
            this.errorMessage.set('');
        }
    }

    onClose() {
        this.close.emit();
    }

    onBackdropClick(event: Event) {
        if (event.target === event.currentTarget) {
            this.onClose();
        }
    }

    async onSave() {
        if (!this.name.trim()) {
            this.errorMessage.set('El nombre es requerido');
            return;
        }

        this.isSaving.set(true);
        this.errorMessage.set('');

        try {
            // Actualizar el usuario en el storage local
            const user = this.auth.currentUser();
            if (user) {
                const updatedUser: CashierUser = {
                    ...user,
                    name: this.name.trim(),
                    email: this.email.trim()
                };
                // Actualizar en localStorage y signal
                localStorage.setItem('cashier_user', JSON.stringify(updatedUser));
                this.auth.currentUser.set(updatedUser);
            }

            this.onClose();
        } catch (error) {
            this.errorMessage.set('Error al guardar los cambios');
        } finally {
            this.isSaving.set(false);
        }
    }
}
