import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Agregamos RouterLink
import { UiService } from '../../core/services/ui.service';
import { ShiftsService } from '../../core/services/shifts.service'; // <--- Usamos el servicio
import { OpenSessionModalComponent } from '../pos/session/open-session/open-session-modal';
import { PrintingService } from '../../core/services/printing.service'; // Ajusta la ruta si es necesario
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-cash-session',
  standalone: true,
  imports: [CommonModule, FormsModule, OpenSessionModalComponent],
  templateUrl: './cash-session.html',
})
export class CashSessionComponent implements OnInit {
  private shiftsService = inject(ShiftsService); // <--- Inyectamos Servicio
  private router = inject(Router);
  private ui = inject(UiService);
  private cdr = inject(ChangeDetectorRef);
  private printingService = inject(PrintingService);
  private confirm = inject(ConfirmService);

  loading = true;
  submitting = false;

  // Control de estado
  isClosed = false;
  showOpenModal = false;

  // Cálculos
  systemBalance = 0;
  countedCash: number | null = null; // null al principio para no mostrar diferencia errónea
  difference = 0;

  // Desglose visual
  details = {
    initial: 0,
    salesCash: 0,
    salesAccount: 0,
    refundsCash: 0, // Nuevo
    topupsCash: 0,  // Nuevo
    movementsTotal: 0,
  };

  ngOnInit() {
    this.ui.setPageTitle('Gestión de Caja', 'Arqueo y Cierre');
    this.loadSessionData();
  }

  loadSessionData() {
    this.loading = true;

    // Usamos el servicio centralizado
    this.shiftsService.getSummary().subscribe({
      next: (data) => {
        // 1. Datos Crudos
        const initial = data.session?.openingBalanceCents ?? 0;

        // 2. Calcular Ventas/Reembolsos/Recargas (Desde transactions)
        let salesCash = 0;
        let salesAccount = 0;
        let refundsCash = 0;
        let topupsCash = 0;

        if (data.salesBreakdown) {
          salesCash = data.salesBreakdown.salesCash ?? 0;
          salesAccount = data.salesBreakdown.salesAccount ?? 0;
          refundsCash = data.salesBreakdown.refundsCash ?? 0;
          topupsCash = data.salesBreakdown.topupsCash ?? 0;
        }

        // 3. Calcular Movimientos Manuales (IN/OUT/DROP/VOID)
        // El backend devuelve 'movs' agrupados.
        let manualMovements = 0;
        if (data.movs && Array.isArray(data.movs)) {
          data.movs.forEach((m: any) => {
            // Todos los movimientos manuales suman o restan
            manualMovements += (m._sum.amount || 0);
          });
        }

        // 4. Asignar a variables de vista
        this.details.initial = initial;
        this.details.salesCash = salesCash;
        this.details.salesAccount = salesAccount;
        this.details.refundsCash = refundsCash; // Nuevo
        this.details.topupsCash = topupsCash;   // Nuevo
        this.details.movementsTotal = manualMovements;

        // 5. El Gran Total Esperado
        // initial + ventas_efectivo + recargas_efectivo - devoluciones_efectivo + movimientos_manuales
        // Nota: El backend ya devuelve expectedBalanceCents en data.session.expectedBalanceCents
        // Pero lo recalculamos aquí para consistencia visual si queremos, o usamos el del backend.
        // Usemos el del backend que es la fuente de verdad.
        this.systemBalance = data.session.expectedBalanceCents ??
          (initial + salesCash + topupsCash - refundsCash + manualMovements);

        this.isClosed = false;
        this.loading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.isClosed = true;
        } else {
          console.error(err);
          this.ui.showToast('Error de conexión con el servidor', 'error');
        }
        this.cdr.detectChanges();
      }
    });
  }

  get hasDiff(): boolean {
    return this.countedCash !== null;
  }

  updateDifference() {
    if (this.countedCash === null) return;
    const systemPesos = this.systemBalance / 100;
    this.difference = this.countedCash - systemPesos;
  }

  printX() {
    // Reutilizamos los datos cargados en this.details y this.systemBalance
    // Pero necesitamos el objeto session completo.
    // Lo ideal es guardar la 'session' en una variable de clase al cargar.
    // Como no la guardé, voy a hacer fetch de nuevo o la guardo ahora.
    // Voy a hacer fetch rápido para tener lo último.
    this.shiftsService.getSummary().subscribe(data => {
      this.printingService.printXReport({
        session: data.session,
        summary: {
          salesCash: this.details.salesCash,
          salesAccount: this.details.salesAccount,
          refundsCash: this.details.refundsCash,
          topupsCash: this.details.topupsCash,
          movementsTotal: this.details.movementsTotal
        }
      });
    });
  }

  async closeSession() {
    if (this.countedCash === null) return;

    const ok = await this.confirm.confirm({
      title: '¿Cerrar caja?',
      message: 'Estás a punto de cerrar la sesión de caja. Esta acción no se puede deshacer y generará el reporte Z.',
      confirmText: 'Sí, cerrar caja',
      type: 'warning'
    });

    if (!ok) return;

    this.submitting = true;

    const dto = {
      countedCash: Math.round(this.countedCash * 100),
      closingNote: 'Cierre desde Pantalla de Gestión'
    };

    this.shiftsService.closeSession(dto).subscribe({
      next: (res) => {

        this.printingService.printZReport({
          session: res,
          summary: {
            salesCash: this.details.salesCash,
            salesAccount: this.details.salesAccount,
            refundsCash: this.details.refundsCash,
            topupsCash: this.details.topupsCash,
            movementsTotal: this.details.movementsTotal
          }
        });

        this.ui.showToast('Caja cerrada correctamente');
        this.ui.isOnline.set(true); // Opcional: Actualizar estado UI
        this.router.navigate(['/home']); // O al login
      },
      error: (err) => {
        this.ui.showToast(err.error?.message || 'Error al cerrar la caja', 'error');
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSessionOpened() {
    this.showOpenModal = false;
    this.loadSessionData();
  }
}
