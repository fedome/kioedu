import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CashierAuthService } from '../../core/auth/cashier-auth.service';
import { UiService } from '../../core/services/ui.service';
import { EditProfileModalComponent } from '../edit-profile-modal/edit-profile-modal';
import { SyncService } from '../../core/services/sync.service';
import { AiChatWidgetComponent } from '../../features/ai-chat/ai-chat-widget/ai-chat-widget';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, EditProfileModalComponent, AiChatWidgetComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})

export class ShellComponent {
  public auth = inject(CashierAuthService);
  private router = inject(Router);
  public ui = inject(UiService);
  public sync = inject(SyncService); // Inyectamos SyncService

  // Estado del menú desplegable
  isDropdownOpen = signal(false);

  // Estado del sidebar colapsable
  isSidebarCollapsed = signal(false);

  // Estado del modal de edición
  isEditModalOpen = signal(false);

  // Obtener las iniciales del usuario
  getUserInitials(): string {
    const user = this.auth.currentUser();
    if (!user?.name) return '?';

    const names = user.name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  }

  toggleDropdown(event?: Event) {
    event?.stopPropagation();
    this.isDropdownOpen.update(v => !v);
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }

  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  openEditModal() {
    this.closeDropdown();
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.closeDropdown();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['login']);
  }
}
