import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { UiService } from '../../../core/services/ui.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-category-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './category-list.html',
})
export class CategoryListComponent implements OnInit {
    private categoriesService = inject(CategoriesService);
    private ui = inject(UiService);
    private confirmService = inject(ConfirmService);
    private notifications = inject(NotificationService);

    categories: Category[] = [];
    loading = false;

    // New Category
    newName = '';
    newDescription = '';

    // Edit Mode
    editingId: number | null = null;
    editName = '';
    editDescription = '';

    ngOnInit() {
        this.ui.setPageTitle('Inventario', 'Categorías');
        this.loadCategories();
    }

    loadCategories() {
        this.loading = true;
        this.categoriesService.getAll().subscribe({
            next: (data) => {
                this.categories = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    create() {
        if (!this.newName.trim()) return;

        this.categoriesService.create(this.newName, this.newDescription).subscribe({
            next: () => {
                this.newName = '';
                this.newDescription = '';
                this.loadCategories();
            },
            error: (err) => this.notifications.error('Error', 'Error al crear categoría')
        });
    }

    startEdit(cat: Category) {
        this.editingId = cat.id;
        this.editName = cat.name;
        this.editDescription = cat.description || '';
    }

    cancelEdit() {
        this.editingId = null;
        this.editName = '';
        this.editDescription = '';
    }

    saveEdit(id: number) {
        if (!this.editName.trim()) return;

        this.categoriesService.update(id, { name: this.editName, description: this.editDescription }).subscribe({
            next: () => {
                this.editingId = null;
                this.loadCategories();
            },
            error: (err) => this.notifications.error('Error', 'Error al actualizar')
        });
    }

    async delete(id: number) {
        const ok = await this.confirmService.confirm({
            title: 'Eliminar categoría',
            message: '¿Seguro que deseas eliminar esta categoría?',
            confirmText: 'Eliminar',
            type: 'danger'
        });
        if (!ok) return;

        this.categoriesService.delete(id).subscribe({
            next: () => this.loadCategories(),
            error: (err) => this.notifications.error('Error', 'Error al eliminar')
        });
    }
}
