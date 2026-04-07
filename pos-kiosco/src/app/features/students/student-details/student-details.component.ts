import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, User, Banknote, History, ArrowLeft, CreditCard } from 'lucide-angular';
import { StudentsService } from '../../../core/services/students.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-student-details',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
    templateUrl: './student-details.html'
})
export class StudentDetailsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private studentsService = inject(StudentsService);
    private notifications = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef);

    readonly UserIcon = User;
    readonly BanknoteIcon = Banknote;
    readonly HistoryIcon = History;
    readonly ArrowLeftIcon = ArrowLeft;
    readonly CreditCardIcon = CreditCard;


    student: any = null;
    transactions: any[] = [];
    loading = true; // Start loading true

    // Payment Modal
    showPaymentModal = false;
    paymentAmount: number | null = null;
    paymentMethod: 'CASH' | 'TRANSFER' = 'CASH';

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            await this.loadData(+id);
        } else {
            this.loading = false;
            this.cdr.markForCheck();
        }
    }

    async loadData(id: number) {
        this.loading = true;
        this.cdr.markForCheck(); // Show spinner immediately
        try {
            // Load in parallel
            const [studentData, transactionsData] = await Promise.all([
                this.studentsService.getStudent(id),
                this.studentsService.getStudentTransactions(id)
            ]);

            this.student = studentData;
            this.transactions = transactionsData || []; // Ensure not undefined

            // Pre-fill payment with total debt if negative
            if (this.student && this.student.balanceCents < 0) {
                this.paymentAmount = Math.abs(this.student.balanceCents) / 100;
            }

            if (!this.student) {
                this.notifications.warning('Atención', 'No se encontró información detallada del alumno.');
            }
        } catch (error) {
            console.error('Error loading student', error);
            this.notifications.error('Error', 'No se pudo cargar la información del alumno');
        } finally {
            this.loading = false;
            this.cdr.markForCheck();
        }
    }

    async submitPayment() {
        if (!this.student || !this.paymentAmount) return;

        try {
            const amountCents = Math.round(this.paymentAmount * 100);
            await this.studentsService.registerPayment(this.student.id, amountCents, this.paymentMethod);

            this.notifications.success('Pago Registrado', 'El saldo del alumno ha sido actualizado');
            this.showPaymentModal = false;
            await this.loadData(this.student.id); // Reload
        } catch (error) {
            console.error(error);
            this.notifications.error('Error', 'No se pudo registrar el pago');
        }
    }
}
