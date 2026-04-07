import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, Role } from '../../../core/services/users.service';
import { UiService } from '../../../core/services/ui.service';

interface Permission {
    id: number;
    action: string;
    subject: string;
    description?: string;
}

@Component({
    selector: 'app-role-form-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './role-form-modal.html',
    styleUrls: ['./role-form-modal.scss']
})
export class RoleFormModalComponent implements OnChanges, OnInit {
    private usersService = inject(UsersService);
    private ui = inject(UiService);

    @Input() isOpen = false;
    @Input() role: Role | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    // Form fields
    name = '';
    description = '';
    selectedPermissionIds: number[] = [];

    // Data
    availablePermissions = signal<Permission[]>([]);
    isSaving = signal(false);
    errorMessage = signal('');

    // Computed grouping
    private permissionsBySubjectCache: Record<string, Permission[]> = {};

    get subjects(): string[] {
        const perms = this.availablePermissions();
        const subjects = Array.from(new Set(perms.map(p => p.subject)));
        return subjects.sort();
    }

    getPermissionsBySubject(subject: string): Permission[] {
        return this.availablePermissions().filter(p => p.subject === subject);
    }

    getSubjectLabel(subject: string): string {
        const labels: Record<string, string> = {
            'pos': 'Punto de Venta',
            'products': 'Inventario y Productos',
            'users': 'Usuarios del Sistema',
            'roles': 'Roles y Permisos',
            'students': 'Gestión de Alumnos',
            'reports': 'Reportes y Estadísticas',
            'audit': 'Auditoría',
            'settings': 'Ajustes del Sistema'
        };
        return labels[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);
    }

    async ngOnInit() {
        try {
            const perms = await (this.usersService as any).findAllPermissions();
            this.availablePermissions.set(perms);
        } catch (error) {
            console.error('Error loading permissions', error);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen']?.currentValue === true) {
            if (this.role) {
                this.name = this.role.name;
                this.description = this.role.description || '';
                this.selectedPermissionIds = this.role.permissions?.map((p: any) => p.permissionId) || [];
            } else {
                this.resetForm();
            }
            this.errorMessage.set('');
        }
    }

    resetForm() {
        this.name = '';
        this.description = '';
        this.selectedPermissionIds = [];
    }

    onClose() {
        this.close.emit();
    }

    togglePermission(permissionId: number) {
        const index = this.selectedPermissionIds.indexOf(permissionId);
        if (index > -1) {
            this.selectedPermissionIds.splice(index, 1);
        } else {
            this.selectedPermissionIds.push(permissionId);
        }
    }

    isPermissionSelected(id: number): boolean {
        return this.selectedPermissionIds.includes(id);
    }

    async onSave() {
        if (!this.name.trim()) {
            this.errorMessage.set('El nombre del rol es requerido');
            return;
        }

        this.isSaving.set(true);
        this.errorMessage.set('');

        try {
            const payload = {
                name: this.name.trim(),
                description: this.description.trim(),
                permissionIds: this.selectedPermissionIds
            };

            if (this.role) {
                await (this.usersService as any).updateRole(this.role.id, payload);
                this.ui.showToast('Rol actualizado correctamente', 'success');
            } else {
                await (this.usersService as any).createRole(payload);
                this.ui.showToast('Rol creado correctamente', 'success');
            }

            this.saved.emit();
            this.onClose();
        } catch (error: any) {
            this.errorMessage.set(error.message || 'Error al guardar el rol');
        } finally {
            this.isSaving.set(false);
        }
    }
}
