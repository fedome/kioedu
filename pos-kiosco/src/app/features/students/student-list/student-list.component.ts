import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Users, ChevronRight, User } from 'lucide-angular';
import { StudentsService } from '../../../core/services/students.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
    selector: 'app-student-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './student-list.html'
})
export class StudentListComponent implements OnInit {
    private studentsService = inject(StudentsService);
    private ui = inject(UiService);
    private cdr = inject(ChangeDetectorRef);

    // Icons
    readonly SearchIcon = Search;
    readonly UsersIcon = Users;
    readonly ChevronRightIcon = ChevronRight;
    readonly UserIcon = User;

    students: any[] = [];
    searchQuery = '';
    loading = false;

    async ngOnInit() {
        this.ui.setPageTitle('Alumnos', 'Gestión de estudiantes');
        await this.search();
    }

    async search() {
        this.loading = true;
        try {
            const q = this.searchQuery || '';
            this.students = await this.studentsService.search(q);
        } finally {
            this.loading = false;
            this.cdr.markForCheck(); // Trigger detection
        }
    }
}
