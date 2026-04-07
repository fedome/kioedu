import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, User, Role } from '../../../core/services/users.service';
import { UiService } from '../../../core/services/ui.service';
import { CashierAuthService } from '../../../core/auth/cashier-auth.service';

@Component({
    selector: 'app-user-form-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-form-modal.html',
    styleUrls: ['./user-form-modal.scss']
})
export class UserFormModalComponent implements OnChanges, OnInit {
    private usersService = inject(UsersService);
    private ui = inject(UiService);
    private auth = inject(CashierAuthService);

    @Input() isOpen = false;
    @Input() user: User | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    // Form fields
    name = '';
    email = '';
    password = '';
    selectedRoles: string[] = [];

    // Data
    availableRoles = signal<Role[]>([]);
    isSaving = signal(false);
    errorMessage = signal('');

    async ngOnInit() {
        await this.loadRoles();
    }

    async loadRoles() {
        try {
            const schoolId = this.auth.currentUser()?.schoolId;
            const roles = await this.usersService.findAllRoles(schoolId, true);
            this.availableRoles.set(roles);
        } catch (error) {
            console.error('Error loading roles', error);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen']?.currentValue === true) {
            if (this.user) {
                this.name = this.user.name;
                this.email = this.user.email;
                this.password = '';
                this.selectedRoles = [...(this.user.roles || [])];
            } else {
                this.resetForm();
            }
            this.errorMessage.set('');
        }
    }

    resetForm() {
        this.name = '';
        this.email = '';
        this.password = '';
        this.selectedRoles = [];
    }

    onClose() {
        this.close.emit();
    }

    toggleRole(roleName: string) {
        const index = this.selectedRoles.indexOf(roleName);
        if (index > -1) {
            this.selectedRoles = this.selectedRoles.filter(r => r !== roleName);
        } else {
            this.selectedRoles = [...this.selectedRoles, roleName];
        }
    }

    isRoleSelected(roleName: string): boolean {
        return this.selectedRoles.includes(roleName);
    }

    async onSave() {
        if (!this.name.trim() || !this.email.trim()) {
            this.errorMessage.set('Nombre y email son requeridos');
            return;
        }

        if (!this.user && !this.password.trim()) {
            this.errorMessage.set('La contraseña es requerida para nuevos usuarios');
            return;
        }

        this.isSaving.set(true);
        this.errorMessage.set('');

        try {
            const payload: any = {
                name: this.name.trim(),
                email: this.email.trim(),
                roles: this.selectedRoles
            };

            if (this.user) {
                // Update
                const updatePayload: any = {
                    name: this.name.trim(),
                    email: this.email.trim(),
                    roles: this.selectedRoles,
                    schoolId: this.auth.currentUser()?.schoolId
                };
                if (this.password.trim()) {
                    updatePayload.password = this.password.trim();
                }
                await this.usersService.update(this.user.id, updatePayload);
                this.ui.showToast('Usuario actualizado correctamente', 'success');
            } else {
                // Create
                const createPayload = {
                    name: this.name.trim(),
                    email: this.email.trim(),
                    password: this.password.trim(),
                    roles: this.selectedRoles,
                    schoolId: this.auth.currentUser()?.schoolId
                };
                await this.usersService.create(createPayload);
                this.ui.showToast('Usuario creado correctamente', 'success');
            }

            this.saved.emit();
            this.onClose();
        } catch (error: any) {
            this.errorMessage.set(error.message || 'Error al guardar el usuario');
        } finally {
            this.isSaving.set(false);
        }
    }
}
