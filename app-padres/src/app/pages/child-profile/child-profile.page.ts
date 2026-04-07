import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AlertController,
  ModalController,
  ToastController,
  IonicModule,
  IonPopover
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  walletOutline,
  cardOutline,
  lockClosedOutline,
  lockOpenOutline,
  chevronForwardOutline,
  fastFoodOutline,
  receiptOutline,
  ellipsisVertical,
  pencilOutline,
  trashOutline
} from 'ionicons/icons';

import { ChildrenService, SpendingSummary, CardEvent } from 'src/app/services/children/children.service';
import { Child } from 'src/app/interfaces/child.interface';
import { TopupModalComponent } from 'src/app/components/topup-modal/topup-modal.component';
import { PaymentsService } from 'src/app/services/payments/payments.service';
import { ActivityItem } from '../activity/activity.page';
import { AccountMovement } from 'src/app/interfaces/account-statement.interface';
import { map } from 'rxjs/operators';
import { PurchaseDetailModalComponent } from 'src/app/components/purchase-detail-modal/purchase-detail-modal.component';
import { AddChildModalComponent } from 'src/app/components/add-child-modal/add-child-modal.component';

@Component({
  selector: 'app-child-profile',
  templateUrl: './child-profile.page.html',
  styleUrls: ['./child-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
export class ChildProfilePage implements OnInit {
  private childrenService = inject(ChildrenService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private paymentsService = inject(PaymentsService);
  private router = inject(Router);

  child: Child | null = null;
  recentActivity: ActivityItem[] = [];
  loading = true;
  pendingTopups: ActivityItem[] = [];
  spendingSummary: SpendingSummary | null = null;
  cardEvents: CardEvent[] = [];
  summaryDays = 7;

  constructor() {
    addIcons({
      chevronBackOutline,
      walletOutline,
      cardOutline,
      lockClosedOutline,
      lockOpenOutline,
      chevronForwardOutline,
      fastFoodOutline,
      receiptOutline,
      ellipsisVertical,
      pencilOutline,
      trashOutline
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadChild(parseInt(id, 10));
      }
    });
  }

  loadChild(id: number) {
    this.loading = true;
    this.childrenService.getMyChildren().subscribe(children => {
      const found = children.find(c => c.id === id);
      if (found) {
        this.child = found;
        this.loadRecentActivity(id);
        this.loadSpendingSummary(id);
        this.loadCardEvents(id);
      }
      this.loading = false;
    });
  }

  loadRecentActivity(childId: number) {
    this.childrenService.getStatement(childId, 5).pipe(
      map((movs: AccountMovement[]) =>
        movs.map((m) => (<ActivityItem>{
          id: m.id,
          childId: childId,
          childName: '',
          type: m.type,
          status: m.status as any,
          createdAt: m.createdAt,
          amountCents: m.totalCents,
          description: m.description,
          items: m.items,
        }))
      )
    ).subscribe(items => {
      this.recentActivity = items;
      // Detect ALL pending CASH topups
      this.pendingTopups = items.filter(i => i.type === 'TOPUP' && i.status === 'PENDING');
    });
  }

  goBack() {
    this.location.back();
  }

  async openRecharge(ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!this.child) return;

    const modal = await this.modalCtrl.create({
      component: TopupModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child: this.child },
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadChild(this.child.id);
    }
  }

  async viewPendingTicket(topup: ActivityItem) {
    if (!this.child) return;
    
    const modal = await this.modalCtrl.create({
      component: TopupModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { 
        child: this.child,
        initialView: 'ticket',
        pendingTransaction: topup
      },
    });

    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadChild(this.child.id);
    }
  }

  async cancelPendingTopup(ev: Event, topup: ActivityItem) {
    ev.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: '¿Eliminar Solicitud?',
      message: '¿Estás seguro de que querés cancelar esta recarga de efectivo pendiente?',
      mode: 'ios',
      buttons: [
        { text: 'No, mantener', role: 'cancel' },
        { 
          text: 'Sí, eliminar', 
          role: 'destructive',
          handler: () => {
            this.paymentsService.cancelTopup(topup.id).subscribe({
              next: () => {
                this.showToast('Solicitud eliminada correctamente', 'success');
                if (this.child) this.loadChild(this.child.id);
              },
              error: () => this.showToast('Error al eliminar la solicitud', 'danger')
            });
          }
        }
      ]
    });
    
    await alert.present();
  }

  async updateDailyLimit() {
    if (!this.child) return;

    const currentLimit = (this.child.dailyLimit?.limitCents || 0) / 100;

    const alert = await this.alertCtrl.create({
      header: 'Límite Diario',
      subHeader: 'Establecé el tope máximo de gasto por día',
      inputs: [
        {
          name: 'limit',
          type: 'number',
          placeholder: 'Monto en pesos',
          value: currentLimit === 0 ? '' : currentLimit
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const newLimitCents = Math.round(parseFloat(data.limit) * 100);
            if (isNaN(newLimitCents) || newLimitCents < 0) return false;

            this.childrenService.updateChild(this.child!.id, {
              dailyLimit: { limitCents: newLimitCents }
            }).subscribe({
              next: (updatedChild) => {
                this.child = updatedChild;
                this.showToast('Límite actualizado correctamente', 'success');
              },
              error: () => this.showToast('Error al actualizar el límite', 'danger')
            });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleCardBlock() {
    if (!this.child || !this.child.card) return;
    
    const newStatus = !this.child.card.isBlocked;
    const actionText = newStatus ? 'bloquear' : 'desbloquear';
    
    const alert = await this.alertCtrl.create({
      header: `¿${newStatus ? 'Bloquear' : 'Desbloquear'} Credencial?`,
      message: `¿Estás seguro de que querés ${actionText} la pulsera de ${this.child.firstName}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Confirmar', 
          handler: () => {
            this.childrenService.toggleCardBlock(this.child!.id, newStatus).subscribe({
              next: () => {
                this.child = {
                  ...this.child!,
                  card: { ...this.child!.card!, isBlocked: newStatus }
                };
                this.showToast(`Credencial ${newStatus ? 'bloqueada' : 'desbloqueada'} exitosamente`, 'success');
              },
              error: () => this.showToast(`Error al ${actionText} la credencial`, 'danger')
            });
          }
        }
      ]
    });
    
    await alert.present();
  }

  async reportLostCard() {
    if (!this.child || !this.child.card) return;

    const alert = await this.alertCtrl.create({
      header: '¿Tarjeta Perdida?',
      message: `¿Estás seguro de que querés bloquear la tarjeta de ${this.child.firstName}? No podrá realizar compras hasta que vincules una nueva.`,
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Bloquear Tarjeta',
          role: 'destructive',
          handler: () => {
            this.childrenService.blockCard(this.child!.id).subscribe({
              next: () => {
                if (this.child && this.child.card) {
                  this.child.card = { ...this.child.card, isBlocked: true };
                }
                this.showToast('Tarjeta bloqueada correctamente', 'success');
              },
              error: () => this.showToast('Error al bloquear la tarjeta', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openDetail(item: ActivityItem) {
    if (item.type !== 'SALE' || !item.items || item.items.length === 0) return;
    const modal = await this.modalCtrl.create({
      component: PurchaseDetailModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { transaction: item }
    });
    await modal.present();
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  isDebit(item: ActivityItem): boolean {
    return item.type === 'SALE';
  }

  getAmountSign(item: ActivityItem): string {
    return this.isDebit(item) ? '-' : '+';
  }

  async updateChildDetails() {
    if (!this.child) return;

    const modal = await this.modalCtrl.create({
      component: AddChildModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: {
        mode: 'edit',
        child: this.child
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      this.childrenService.updateChild(this.child.id, data).subscribe({
        next: (updated) => {
          this.child = { ...this.child, ...updated }; // merged update
          this.showToast('Datos actualizados', 'success');
        },
        error: () => this.showToast('Error al actualizar', 'danger')
      });
    }
  }

  async deleteChild() {
    if (!this.child) return;

    const alert = await this.alertCtrl.create({
      header: '¿Eliminar Alumno?',
      message: `¿Estás seguro de que querés eliminar a ${this.child.firstName}? Esta acción no se puede deshacer.`,
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.childrenService.deactivateChild(this.child!.id).subscribe({
              next: () => {
                this.showToast('Alumno eliminado', 'success');
                this.router.navigateByUrl('/tabs/dashboard');
              },
              error: () => this.showToast('Error al eliminar', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── New Features ─────────────────────────────

  loadSpendingSummary(childId: number) {
    this.childrenService.getSpendingSummary(childId, this.summaryDays).subscribe({
      next: (summary) => this.spendingSummary = summary,
      error: () => this.spendingSummary = null,
    });
  }

  loadCardEvents(childId: number) {
    this.childrenService.getCardEvents(childId).subscribe({
      next: (events) => this.cardEvents = events,
      error: () => this.cardEvents = [],
    });
  }

  changeSummaryPeriod(days: number) {
    this.summaryDays = days;
    if (this.child) {
      this.loadSpendingSummary(this.child.id);
    }
  }

  getCategoryColor(index: number): string {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
    return colors[index % colors.length];
  }

  getEventIcon(event: string): string {
    switch (event) {
      case 'ACTIVATED': return 'checkmark-circle-outline';
      case 'BLOCKED': return 'lock-closed-outline';
      case 'UNBLOCKED': return 'lock-open-outline';
      case 'LOST': return 'alert-circle-outline';
      case 'REPLACED': return 'swap-horizontal-outline';
      default: return 'information-circle-outline';
    }
  }

  getEventLabel(event: string): string {
    switch (event) {
      case 'ACTIVATED': return 'Tarjeta activada';
      case 'BLOCKED': return 'Tarjeta bloqueada';
      case 'UNBLOCKED': return 'Tarjeta desbloqueada';
      case 'LOST': return 'Tarjeta reportada como perdida';
      case 'REPLACED': return 'Tarjeta reemplazada';
      default: return event;
    }
  }
}
