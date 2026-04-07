import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonicModule,
  AlertController,
  ModalController,
  ToastController,
  ActionSheetController,
  IonPopover
} from '@ionic/angular';
import { ViewChild } from '@angular/core';

import { ChildrenService } from 'src/app/services/children/children.service';
import { AddChildModalComponent } from '../../components/add-child-modal/add-child-modal.component';

import { addIcons } from 'ionicons';
import {
  schoolOutline,
  chevronForward,
  walletOutline,
  alertCircleOutline,
  add,
  menuOutline,
  notificationsOutline,
  notificationsOffOutline,
  trashOutline,
  fastFoodOutline,
  cardOutline,
  addCircleOutline,
  idCardOutline,
  optionsOutline,
  swapHorizontalOutline,
  ellipsisVertical,
  pencilOutline,
} from 'ionicons/icons';
import { CardInfoModalComponent } from "../../components/card-info-modal/card-info-modal.component";
import { TopupModalComponent } from "../../components/topup-modal/topup-modal.component";
import { LimitModalComponent } from "../../components/limit-modal/limit-modal.component";
import { LinkCardModalComponent } from "../../components/link-card-modal/link-card-modal.component";
import {
  ConfirmDeleteChildModalComponent
} from "../../components/confirm-delete-child-modal/confirm-delete-child-modal.component";

import { NotificationsBellComponent } from 'src/app/components/notifications-bell/notifications-bell.component';
import { NotificationEventsService } from 'src/app/services/notification/notification-events.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { UserProfile, Child } from 'src/app/interfaces/child.interface';
import { ChildIdModalComponent } from '../../components/child-id-modal/child-id-modal.component';
import { PurchaseDetailModalComponent } from '../../components/purchase-detail-modal/purchase-detail-modal.component';
import { TransferModalComponent } from '../../components/transfer-modal/transfer-modal.component';
import { ActivityItem } from '../activity/activity.page';
import { ChildSelectionModalComponent } from '../../components/child-selection-modal/child-selection-modal.component';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AccountMovement } from 'src/app/interfaces/account-statement.interface';
import { CacheService } from 'src/app/services/cache/cache.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  // ChildIdModalComponent is used programmatically via ModalController, 
  // so it doesn't need to be in the template imports.
  imports: [CommonModule, IonicModule, RouterModule, NotificationsBellComponent],
})
export class DashboardPage implements OnInit {
  private childrenService = inject(ChildrenService);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private notificationEvents = inject(NotificationEventsService);
  private actionSheetCtrl = inject(ActionSheetController);
  private auth = inject(AuthService);
  private cache = inject(CacheService);

  children: Child[] = [];
  loading = true;
  profile: UserProfile | null = null;
  recentActivity: ActivityItem[] = [];

  @ViewChild('cardPopover') cardPopover!: IonPopover;
  selectedPopoverChild: Child | null = null;
  weeklyStats: { day: string, amountCents: number, height: number }[] = [];
  totalWeeklySpentCents: number = 0;

  get globalBalance(): number {
    return this.children.reduce((acc, c) => acc + (c.accounts?.[0]?.balanceCents || 0), 0);
  }

  get lowBalanceChild(): Child | null {
    const LOW_THRESHOLD = 50000; // $500.00 pesos
    const found = this.children.find(c => (c.accounts?.[0]?.balanceCents || 0) < LOW_THRESHOLD);
    return found || null;
  }

  private NOTIFY_MOVEMENTS_KEY = 'mk-settings-notify-movements';

  constructor() {
    addIcons({
      schoolOutline, chevronForward, walletOutline, alertCircleOutline, add,
      menuOutline, notificationsOutline, notificationsOffOutline, trashOutline,
      fastFoodOutline, cardOutline, addCircleOutline, idCardOutline, optionsOutline,
      swapHorizontalOutline,
      ellipsisVertical,
      pencilOutline,
    });

    //this.notificationsEnabled = this.getNotifyMovementsFlag();
  }

  ngOnInit() {
    this.hydrateFromCache();
    this.loadData();
    this.loadProfile();
  }

  private async hydrateFromCache() {
    const cachedChildren = await this.cache.getChildren<Child>();
    if (cachedChildren && cachedChildren.length > 0) {
      this.children = cachedChildren;
      this.loading = false;
    }

    const cachedProfile = await this.cache.getProfile<UserProfile>();
    if (cachedProfile) this.profile = cachedProfile;

    const cachedActivity = await this.cache.getRecentActivity<ActivityItem>();
    if (cachedActivity && cachedActivity.length > 0) {
      this.recentActivity = cachedActivity;
    }
  }

  ionViewWillEnter() {
    this.loadData();
  }

  get greetingTime(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'BUEN DÍA';
    if (hour < 19) return 'BUENAS TARDES';
    return 'BUENAS NOCHES';
  }

  get userName(): string {
    if (!this.profile?.name) return 'Papá';
    return this.profile.name.split(' ')[0];
  }

  private loadProfile() {
    this.auth.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
        this.cache.saveProfile(p);
      },
      error: () => { },
    });
  }

  loadData(event?: any) {
    if (!event) this.loading = true;

    this.childrenService.getMyChildren().subscribe({
      next: (data) => {
        this.children = data;
        this.loading = false;
        this.cache.saveChildren(data);
        this.notificationEvents.checkLowBalanceForChildren(this.children);
        this.loadRecentActivity();
        if (event) event.target.complete();
      },
      error: () => {
        this.loading = false;
        if (event) event.target.complete();
      }
    });
  }

  private loadRecentActivity() {
    if (!this.children.length) {
      this.recentActivity = [];
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requests = this.children.map((child) =>
      this.childrenService.getStatement(child.id, 20).pipe(
        map((movs: AccountMovement[]) => {
          // Calculate spent today for the limit bar
          const spentToday = movs
            .filter(m => {
              const mDate = new Date(m.createdAt);
              mDate.setHours(0, 0, 0, 0);
              return mDate.getTime() === today.getTime() && m.type === 'SALE';
            })
            .reduce((acc, m) => acc + m.totalCents, 0);
          
          if (child.dailyLimit) {
            child.dailyLimit.spentTodayCents = spentToday;
          }

          return movs.map((m) => (<ActivityItem>{
            id: m.id,
            childId: child.id,
            childName: `${child.firstName} ${child.lastName}`,
            childInitials: `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''}`,
            type: m.type,
            status: m.status as any,
            paymentMethod: (m as any).paymentMethod, 
            createdAt: m.createdAt,
            amountCents: m.totalCents,
            description: m.description,
            limitCents: child.dailyLimit?.limitCents ?? null,
            items: m.items,
          }));
        })
      )
    );

    forkJoin(requests).pipe(
      map((lists) => lists.reduce((acc, curr) => acc.concat(curr), [])),
      map((items) => items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    ).subscribe({
      next: (items) => {
        this.recentActivity = items.slice(0, 5);
        this.calculateWeeklyStats(items);
        this.cache.saveRecentActivity(this.recentActivity);
      },
      error: () => this.recentActivity = [],
    });
  }

  private calculateWeeklyStats(items: ActivityItem[]) {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const now = new Date();
    const stats = [];
    let maxDayAmount = 0;
    this.totalWeeklySpentCents = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayExpenses = items.filter(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === d.getTime() && item.type === 'SALE';
      });

      const dayTotal = dayExpenses.reduce((acc, curr) => acc + curr.amountCents, 0);
      if (dayTotal > maxDayAmount) maxDayAmount = dayTotal;
      this.totalWeeklySpentCents += dayTotal;

      stats.push({
        day: days[d.getDay()],
        amountCents: dayTotal,
        height: 0
      });
    }

    // Calculate relative heights for the chart
    this.weeklyStats = stats.map(s => ({
      ...s,
      height: maxDayAmount > 0 ? (s.amountCents / maxDayAmount) * 100 : 0
    }));
  }


  private getNotifyMovementsFlag(): boolean {
    const value = localStorage.getItem(this.NOTIFY_MOVEMENTS_KEY);
    if (value === null) return true; // default: ON
    return value === '1';
  }

  async onAddChild() {
    const modal = await this.modalCtrl.create({
      component: AddChildModalComponent,
      cssClass: 'auto-height-modal',
      backdropDismiss: false,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.childrenService.addChild(data).subscribe({
        next: () => {
          this.loadData();
          this.showNewChildSuccess(data.firstName);
        },
        error: (err) => console.error(err),
      });
    }
  }

  private async showNewChildSuccess(name: string) {
    const alert = await this.alertCtrl.create({
      header: '¡Alumno agregado!',
      message: `Para que ${name} pueda empezar a usar KioEdu, recordá:\n\n1. **Cargar saldo** en su cuenta.\n2. **Activar una tarjeta** para que pueda pagar en el kiosco.`,
      buttons: ['Entendido'],
      mode: 'ios'
    });
    await alert.present();
  }

  async openCardInfo(child: Child, ev?: Event) {
    ev?.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: CardInfoModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child },
      backdropDismiss: true,
    });
    await modal.present();

    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data?.action) return;

    if (data.action === 'kiosk') {
      const toast = await this.toastCtrl.create({
        message: 'Acercate al kiosco escolar con la tarjeta para activarla desde la terminal.',
        duration: 3000,
        color: 'primary',
      });
      await toast.present();
      return;
    }

    // code o nfc -> mismo modal, con autoScan según corresponda
    await this.openLinkCardModal(child, data.action === 'nfc');
  }

  private async openLinkCardModal(child: Child, autoScan = false) {
    const modal = await this.modalCtrl.create({
      component: LinkCardModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child, autoScan },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.updatedChild) {
      const updated = data.updatedChild as Child;
      const idx = this.children.findIndex((c) => c.id === updated.id);
      if (idx !== -1) this.children[idx] = updated;
      else this.loadData();
    }
  }


  // Navegar al detalle del hijo (ChildProfilePage)
  openChildDetail(child: Child) {
    this.router.navigate(['/tabs/dashboard/child', child.id], {
      state: { child },
    });
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

  async openChildId(child: Child, ev: Event) {
    ev.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: ChildIdModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child },
    });
    await modal.present();
  }

  async onEditChild(child: Child) {
    const modal = await this.modalCtrl.create({
      component: AddChildModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: {
        mode: 'edit',
        child,
      },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.id) {
      this.updateChild(data.id, data);
    }
  }

  updateChild(childId: number, dto: any) {
    this.childrenService.updateChild(childId, dto).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Error actualizando hijo', err),
    });
  }

  async openRecharge(child: Child, ev: Event) {
    ev.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: TopupModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child },
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.loadData();
    }
  }

  async openRechargeGlobal(ev: Event) {
    ev.stopPropagation();

    if (this.children.length === 1) {
      return this.openRecharge(this.children[0], ev);
    }

    const modal = await this.modalCtrl.create({
      component: ChildSelectionModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { children: this.children }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      this.openRecharge(data, ev);
    }
  }

  async openLimit(child: Child, ev: Event) {
    ev.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: LimitModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { child },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      // Opción sencilla: recargar to do desde el backend
      this.loadData();
    }
  }

  async openTransfer() {
    const modal = await this.modalCtrl.create({
      component: TransferModalComponent,
      cssClass: 'auto-height-modal',
      componentProps: { children: this.children }
    });
    
    await modal.present();
    
    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadData();
    }
  }

  async onDeleteSwipe(child: Child, sliding: any) {
    if (sliding && typeof sliding.close === 'function') {
      await sliding.close();
    }

    const modal = await this.modalCtrl.create({
      component: ConfirmDeleteChildModalComponent,
      cssClass: 'auto-height-modal', // misma clase que usás en LimitModal
      componentProps: { child },
      backdropDismiss: true,
    });

    await modal.present();

    const { role, data } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.childId) {
      this.deactivateChild(child);
    }
  }


  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      mode: 'ios',
    });
    await toast.present();
  }

  private deactivateChild(child: Child) {
    this.childrenService.deactivateChild(child.id).subscribe({
      next: async () => {
        // Lo sacamos del array local
        this.children = this.children.filter((c) => c.id !== child.id);

        const t = await this.toastCtrl.create({
          message: 'Alumno eliminado correctamente.',
          duration: 2500,
          color: 'success',
        });
        await t.present();
      },
      error: async (err) => {
        console.error('Error al eliminar hijo', err);

        const t = await this.toastCtrl.create({
          message: 'No se pudo eliminar el alumno. Intentá de nuevo.',
          duration: 2500,
          color: 'danger',
        });
        await t.present();
      },
    });
  }


  // --- Popover Actions ---
  openCardOptions(ev: Event, child: Child, index: number) {
    ev.stopPropagation();
    this.selectedPopoverChild = child;
    this.cardPopover.event = ev;
    this.cardPopover.present();
  }

  onEditChildFromPopover() {
    if (this.selectedPopoverChild) {
      this.onEditChild(this.selectedPopoverChild);
    }
  }

  openLimitFromPopover() {
    if (this.selectedPopoverChild) {
      this.openLimit(this.selectedPopoverChild, new Event('click'));
    }
  }

  openCardInfoFromPopover() {
    if (this.selectedPopoverChild) {
      this.openCardInfo(this.selectedPopoverChild);
    }
  }

  onDeleteFromPopover() {
    if (this.selectedPopoverChild) {
      this.confirmDelete(this.selectedPopoverChild);
    }
  }

  async onLostCardFromPopover() {
    if (!this.selectedPopoverChild) return;
    this.confirmLostCard(this.selectedPopoverChild);
  }

  private async confirmLostCard(child: Child) {
    const alert = await this.alertCtrl.create({
      header: '¿Tarjeta Perdida?',
      message: `¿Estás seguro de que querés bloquear la tarjeta de ${child.firstName}? No podrá realizar compras hasta que vincules una nueva.`,
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Bloquear Tarjeta',
          role: 'destructive',
          handler: () => {
            this.childrenService.blockCard(child.id).subscribe({
              next: () => {
                this.loadData();
                this.showToast('Tarjeta bloqueada correctamente.', 'success');
              },
              error: () => this.showToast('No se pudo bloquear la tarjeta.', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private async confirmDelete(child: Child) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar Alumno?',
      message: `¿Estás seguro de que querés eliminar a ${child.firstName}? Esta acción no se puede deshacer.`,
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deactivateChild(child)
        }
      ]
    });
    await alert.present();
  }
}
