import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService, Role } from '../../../core/services/users.service';
import { UiService } from '../../../core/services/ui.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { RoleFormModalComponent } from '../role-form-modal/role-form-modal';
import { LucideAngularModule, Plus, Edit, Trash } from 'lucide-angular';

@Component({
    selector: 'app-role-list',
    standalone: true,
    imports: [CommonModule, RoleFormModalComponent, LucideAngularModule],
    templateUrl: './role-list.html',
    styleUrls: ['./role-list.css']
})
export class RoleListComponent implements OnInit {
    private usersService = inject(UsersService);
    private ui = inject(UiService);
    private confirm = inject(ConfirmService);

    // Icons
    readonly PlusIcon = Plus;
    readonly EditIcon = Edit;
    readonly TrashIcon = Trash;

    roles = signal<Role[]>([]);
    isLoading = signal(false);

    // Modal state
    isModalOpen = signal(false);
    selectedRole = signal<Role | null>(null);

    ngOnInit() {
        this.ui.setPageTitle('Roles y Permisos', 'Configuración de accesos');
        this.loadRoles();
    }

    async loadRoles() {
        this.isLoading.set(true);
        try {
            const data = await this.usersService.findAllRoles();
            this.roles.set(data);
        } catch (error) {
            this.ui.showToast('Error al cargar roles', 'error');
        } finally {
            this.isLoading.set(false);
        }
    }

    createRole() {
        this.selectedRole.set(null);
        this.isModalOpen.set(true);
    }

    editRole(role: Role) {
        this.selectedRole.set(role);
        this.isModalOpen.set(true);
    }

    async deleteRole(role: Role) {
        const confirmed = await this.confirm.confirm({
            title: 'Eliminar Rol',
            message: `¿Estás seguro de que deseas eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            // Nota: El backend RolesController tiene deleteRole
            // Necesitamos asegurar que UsersService tenga el método
            await (this.usersService as any).deleteRole(role.id);
            this.ui.showToast('Rol eliminado correctamente', 'success');
            this.loadRoles();
        } catch (error) {
            this.ui.showToast('Error al eliminar el rol', 'error');
        }
    }

    closeModal() {
        this.isModalOpen.set(false);
        this.selectedRole.set(null);
    }
}
