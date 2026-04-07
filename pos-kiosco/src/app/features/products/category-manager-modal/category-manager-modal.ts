import { Component, EventEmitter, Output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
    selector: 'app-category-manager-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './category-manager-modal.html'
})
export class CategoryManagerModalComponent implements OnInit {
    @Output() closeModel = new EventEmitter<void>();

    private categoriesService = inject(CategoriesService);
    private notifications = inject(NotificationService);
    private confirmService = inject(ConfirmService);

    // Signals for reactivity (Fixes "lazy load" bug)
    categories = signal<Category[]>([]);
    loading = signal(false);

    // Form Inputs (Plain properties for easier ngModel)
    newCategoryName = '';

    // Editing state
    editingId: number | null = null;
    editingName = '';

    ngOnInit() {
        this.loadCategories();
    }

    close() {
        this.closeModel.emit();
    }

    loadCategories() {
        this.loading.set(true);
        this.categoriesService.getAll().subscribe({
            next: (res) => {
                this.categories.set(res);
                this.loading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.notifications.error('Error', 'No se pudieron cargar las categorías');
                this.loading.set(false);
            }
        });
    }

    addCategory() {
        const name = this.newCategoryName.trim();
        if (!name) return;

        this.loading.set(true);
        this.categoriesService.create(name).subscribe({
            next: (cat) => {
                this.categories.update(list => [...list, cat]);
                this.newCategoryName = '';
                this.notifications.success('Éxito', 'Categoría creada');
                this.loading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.notifications.error('Error', 'No se pudo crear la categoría');
                this.loading.set(false);
            }
        });
    }

    startEdit(cat: Category) {
        this.editingId = cat.id;
        this.editingName = cat.name;
    }

    cancelEdit() {
        this.editingId = null;
        this.editingName = '';
    }

    saveEdit(cat: Category) {
        const name = this.editingName.trim();
        if (!name || name === cat.name) {
            this.cancelEdit();
            return;
        }

        this.loading.set(true);
        this.categoriesService.update(cat.id, { name }).subscribe({
            next: (updated) => {
                this.categories.update(list => list.map(c => c.id === cat.id ? updated : c));
                this.notifications.success('Éxito', 'Categoría actualizada');
                this.cancelEdit();
                this.loading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.notifications.error('Error', 'No se pudo actualizar');
                this.loading.set(false);
            }
        });
    }

    async deleteCategory(cat: Category) {
        const ok = await this.confirmService.confirm({
            title: 'Eliminar categoría',
            message: `¿Eliminar la categoría "${cat.name}"?`,
            confirmText: 'Eliminar',
            type: 'danger'
        });
        if (!ok) return;

        this.loading.set(true);
        this.categoriesService.delete(cat.id).subscribe({
            next: () => {
                this.categories.update(list => list.filter(c => c.id !== cat.id));
                this.notifications.success('Eliminada', 'Categoría eliminada');
                this.loading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.notifications.error('Error', 'No se pudo eliminar (puede estar en uso)');
                this.loading.set(false);
            }
        });
    }
}
