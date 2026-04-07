import { Component, EventEmitter, Output, inject, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-charge-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './charge-modal.html',
  styleUrls: ['./charge-modal.scss']
})
export class ChargeModal implements AfterViewInit {
  @Output() cancel = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  // Referencia al input para enfocarlo automáticamente
  @ViewChild('searchInput') searchInput!: ElementRef;

  private api = inject(ApiService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // UI State
  searchTerm = '';
  amount: number | null = null;

  students: any[] = [];
  selectedStudent: any = null;

  loading = false;       // Cargando proceso de cobro
  searching = false;     // Buscando alumno
  searchError = false;   // Flag: "No se encontró"

  pendingTopups: any[] = [];
  loadingPending = false;

  ngAfterViewInit() {
    // Enfocar el input apenas abre para que el lector funcione directo
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 100);
    this.fetchPendingTopups();
  }

  fetchPendingTopups() {
    this.loadingPending = true;
    // Asume que la UI está online para ver topups pendientes
    this.api.get<any[]>('/pos/pending-topups').subscribe({
      next: (res) => {
        this.pendingTopups = res || [];
        this.loadingPending = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching pending topups', err);
        this.loadingPending = false;
        this.cdr.detectChanges();
      }
    });
  }

  approvePendingTopup(topupId: number) {
    if (this.loading) return;
    this.loading = true;
    this.api.post(`/pos/pending-topups/${topupId}/approve`, {}).subscribe({
      next: () => {
        this.notifications.success('Éxito', 'Recarga acreditada con éxito');
        this.pendingTopups = this.pendingTopups.filter((t: any) => t.id !== topupId);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.error('Error', err.error?.message || 'Error al aprobar recarga');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isStudentScanned = false;
  private studentScanBufferTime = 0;
  private studentScanStrokeCount = 0;

  onSearchInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const isFastEnough = (Date.now() - this.studentScanBufferTime) < 200;
      if (this.searchTerm?.length >= 4 && isFastEnough && this.studentScanStrokeCount >= 4) {
         this.isStudentScanned = true;
      } else {
         this.isStudentScanned = false; // it was manually typed or pasted
      }
      this.performSearch();
    } else {
      if (this.studentScanStrokeCount === 0 || (Date.now() - this.studentScanBufferTime) > 300) {
         this.studentScanBufferTime = Date.now();
         this.studentScanStrokeCount = 1;
      } else {
         this.studentScanStrokeCount++;
      }
    }
  }

  // Método explícito de búsqueda (Botón o Enter)
  performSearch() {
    if (!this.searchTerm || this.searchTerm.trim().length < 2) return;

    this.searching = true;
    this.searchError = false; // Reset error
    this.students = [];       // Limpiar anteriores
    this.selectedStudent = null;

    // Llamamos al NUEVO endpoint del POS
    this.api.get<any[]>(`/pos/students/search?q=${this.searchTerm.trim()}`).subscribe({
      next: (res) => {
        this.students = res;
        this.searching = false;

        // Lógica inteligente:
        if (this.students.length === 0) {
          this.searchError = true; // Mostramos cartel de error
        } else if (this.students.length === 1) {
          // Si solo hay uno (ej: escaneo de tarjeta exacto), lo seleccionamos directo
          this.selectStudent(this.students[0]);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.searching = false;
        this.searchError = true;
        this.cdr.detectChanges();
      }
    });
  }

  // Reiniciar para nueva búsqueda
  clearSearch() {
    this.searchTerm = '';
    this.students = [];
    this.selectedStudent = null;
    this.searchError = false;
    this.isStudentScanned = false;
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }

  selectStudent(student: any) {
    this.selectedStudent = student;
    this.students = [];
    this.searchError = false;
    // Opcional: Enfocar el input de monto automáticamente
  }

  confirmCharge() {
    if (!this.selectedStudent || !this.amount || this.amount <= 0) return;
    this.loading = true;

    const payload = {
      childId: this.selectedStudent.id,
      amountCents: Math.round(this.amount * 100)
    };

    this.api.post('/pos/credit', payload).subscribe({
      next: () => {
        this.notifications.success('Éxito', `Carga exitosa de $${this.amount}`);
        this.success.emit();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.error('Error', err.error?.message || 'Error desconocido');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
