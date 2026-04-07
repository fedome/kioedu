import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService, User } from '../../../core/services/users.service';
import { UiService } from '../../../core/services/ui.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { UserFormModalComponent } from '../user-form-modal/user-form-modal';

import { LucideAngularModule, Plus, Edit, UserX, UserCheck } from 'lucide-angular';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, UserFormModalComponent, LucideAngularModule],
    templateUrl: './user-list.html',
    styleUrls: ['./user-list.css']
})
export class UserListComponent implements OnInit {
    private usersService = inject(UsersService);
    private ui = inject(UiService);
    private confirm = inject(ConfirmService);

    // Icons
    readonly PlusIcon = Plus;
    readonly EditIcon = Edit;
    readonly UserXIcon = UserX;
    readonly UserCheckIcon = UserCheck;

    users = signal<User[]>([]);
    isLoading = signal(false);

    // Modal state
    isModalOpen = signal(false);
    selectedUser = signal<User | null>(null);

    ngOnInit() {
        this.ui.setPageTitle('Gestión de Usuarios', 'Administración de accesos');
        this.loadUsers();
    }

    async loadUsers() {
        this.isLoading.set(true);
        try {
            const data = await this.usersService.findAll();
            // Filtrar usuarios que tienen el rol PARENT (ya que el usuario pidió no verlos en la gestión del kiosco)
            const filtered = data.filter(u => !u.roles.includes('PARENT'));
            this.users.set(filtered);
        } catch (error) {
            this.ui.showToast('Error al cargar usuarios', 'error');
        } finally {
            this.isLoading.set(false);
        }
    }

    async toggleUserStatus(user: User) {
        const action = user.isActive === false ? 'reactivar' : 'desactivar';
        const confirmed = await this.confirm.confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
            message: `¿Estás seguro de que deseas ${action} a ${user.name}?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            type: user.isActive === false ? 'warning' : 'danger'
        });

        if (!confirmed) return;

        try {
            if (user.isActive === false) {
                await this.usersService.reactivate(user.id);
                this.ui.showToast('Usuario reactivado', 'success');
            } else {
                await this.usersService.delete(user.id);
                this.ui.showToast('Usuario desactivado', 'success');
            }
            this.loadUsers();
        } catch (error) {
            this.ui.showToast(`Error al ${action} usuario`, 'error');
        }
    }

    editUser(user: User) {
        this.selectedUser.set(user);
        this.isModalOpen.set(true);
    }

    createUser() {
        this.selectedUser.set(null);
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
        this.selectedUser.set(null);
    }
}
