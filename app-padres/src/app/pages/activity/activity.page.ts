import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonButton,
  IonIcon,
  IonLabel,
  IonSegmentButton,
  IonSegment,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonModal
} from '@ionic/angular/standalone';
import { ViewChild } from '@angular/core';

import { PaymentsService } from 'src/app/services/payments/payments.service';

import { ChildrenService } from 'src/app/services/children/children.service';
import { Child } from 'src/app/interfaces/child.interface';
import { AccountMovement } from 'src/app/interfaces/account-statement.interface';

import { addIcons } from 'ionicons';
import {
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  menuOutline,
  notificationsOffOutline,
  notificationsOutline,
  optionsOutline,
  chevronDownOutline,
  fastFoodOutline,
  cardOutline,
  arrowBackOutline,
  walletOutline,
  warningOutline,
  layersOutline,
  personOutline,
  calendarOutline,
  chevronBackOutline,
  pencilOutline,
  lockClosedOutline,
  lockOpenOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { NotificationsBellComponent } from 'src/app/components/notifications-bell/notifications-bell.component';
import { TopupModalComponent } from 'src/app/components/topup-modal/topup-modal.component';
import { PurchaseDetailModalComponent } from 'src/app/components/purchase-detail-modal/purchase-detail-modal.component';

export interface ActivityItem {
  id: number;
  childId: number;
  childName: string;
  childInitials: string;
  type: 'SALE' | 'TOPUP';
  createdAt: string;
  amountCents: number;
  description?: string;
  limitCents: number | null;
  status: 'PENDING' | 'PAID' | 'VOID' | 'REFUNDED';
  paymentMethod?: string;
  items?: any[];
}

@Component({
  selector: 'app-activity',
  standalone: true,
  templateUrl: './activity.page.html',
  styleUrls: ['./activity.page.scss'],
  imports: [
    CommonModule,
    RouterModule,

    // Ionic standalone
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonButton,
    IonIcon,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonModal,

    NotificationsBellComponent,
  ],
})
export class ActivityPage implements OnInit {
  private childrenService = inject(ChildrenService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private paymentsService = inject(PaymentsService); // already here? no, ActivityPage doesn't have it yet

  @ViewChild('filtersModal') filtersModal!: IonModal;

  loading = true;
  items: ActivityItem[] = [];
  filteredItems: ActivityItem[] = [];

  childOptions: { id: number; name: string }[] = [];

  // Used for rendering the specific child profile view natively if routed
  loadedChild: Child | null = null;

  selectedChildId: number | 'all' = 'all';
  selectedType: 'ALL' | 'SALE' | 'TOPUP' = 'ALL';
  //selectedDateRange: 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30' = 'ALL';
  // nueva fecha seleccionada (ISO string, ej: "2025-11-25")
  selectedDate: string | null = null;

  // borradores dentro del popover
  draftChildId: number | 'all' = 'all';
  draftType: 'ALL' | 'SALE' | 'TOPUP' = 'ALL';
  draftDate: string | null = null;

  constructor() {
    addIcons({
      arrowDownCircleOutline,
      arrowUpCircleOutline,
      menuOutline,
      notificationsOutline,
      notificationsOffOutline,
      layersOutline,
      personOutline,
      calendarOutline,
      chevronBackOutline,
      pencilOutline,
      lockClosedOutline,
      lockOpenOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.selectedChildId = parseInt(id, 10);
      } else {
        this.selectedChildId = 'all';
      }
      this.loadActivity();
    });
  }

  ionViewWillEnter() {
    this.loadActivity();
  }

  loadActivity(event?: any) {
    if (!event) {
      this.loading = true;
    }

    this.childrenService
      .getMyChildren()
      .pipe(
        switchMap((children: Child[]) => {
          if (!children.length) {
            return of<ActivityItem[][]>([]);
          }

          const requests = children.map((child) =>
            this.childrenService.getStatement(child.id, 20).pipe(
              map((movs: AccountMovement[]) =>
                movs.map((m) => {
                  return <ActivityItem>{
                    id: m.id,
                    childId: child.id,
                    childName: `${child.firstName} ${child.lastName}`,
                    childInitials: `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''
                      }`,
                    type: m.type,
                    status: m.status as any,
                    createdAt: m.createdAt,
                    amountCents: m.totalCents,
                    description: m.description,
                    limitCents: child.dailyLimit?.limitCents ?? null,
                    items: m.items,
                  };
                }),
              ),
            ),
          );

          return forkJoin(requests);
        }),
        map((listOfLists: ActivityItem[][]) =>
          listOfLists.reduce(
            (acc: ActivityItem[], curr: ActivityItem[]) => acc.concat(curr),
            [],
          ),
        ),
        map((items: ActivityItem[]) =>
          items.sort(
            (a: ActivityItem, b: ActivityItem) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          ),
        ),
      )
      .subscribe({
        next: (items) => {
          this.items = items;
          this.buildChildOptions(items);
          this.syncDraftFilters();
          this.applyFilters();
          this.loading = false;
          if (event) {
            event.target.complete();
          }
        },
        error: (err) => {
          console.error('Error cargando actividad', err);
          this.items = [];
          this.filteredItems = [];
          this.loading = false;
          if (event) {
            event.target.complete();
          }
        },
      });
  }

  isDebit(item: ActivityItem): boolean {
    return item.type === 'SALE';
  }

  getAmountSign(item: ActivityItem): string {
    return this.isDebit(item) ? '-' : '+';
  }

  getTypeLabel(item: ActivityItem): string {
    return item.type === 'SALE'
      ? 'Consumo en kiosco'
      : 'Recarga de saldo';
  }

  // -------- Filtros --------

  private buildChildOptions(items: ActivityItem[]) {
    const map = new Map<number, string>();

    items.forEach((it) => {
      if (!map.has(it.childId)) {
        map.set(it.childId, it.childName);
      }
    });

    this.childOptions = Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  private applyFilters() {
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (this.selectedDate) {
      const [y, m, d] = this.selectedDate.split('-').map(Number);
      if (y && m && d) {
        fromDate = new Date(y, m - 1, d, 0, 0, 0, 0);
        toDate = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    }

    this.filteredItems = this.items.filter((item) => {
      // hijo
      if (this.selectedChildId !== 'all' && item.childId !== this.selectedChildId) {
        return false;
      }

      // tipo
      if (this.selectedType === 'SALE' && item.type !== 'SALE') return false;
      if (this.selectedType === 'TOPUP' && item.type !== 'TOPUP') return false;

      // fecha
      if (fromDate && toDate) {
        const created = new Date(item.createdAt);
        if (created < fromDate || created > toDate) return false;
      }

      return true;
    });
  }


  onDateChange(ev: CustomEvent) {
    this.selectedDate = ev.detail.value || null;
    this.applyFilters();
  }

  openFilters() {
    this.filtersModal.present();
  }

  clearDate() {
    this.selectedDate = null;
    this.applyFilters();
  }



  private computeFromDate(
    range: 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30',
    now: Date,
  ): Date | null {
    const d = new Date(now);

    switch (range) {
      case 'TODAY':
        d.setHours(0, 0, 0, 0);
        return d;
      case 'LAST_7':
        d.setDate(d.getDate() - 7);
        return d;
      case 'LAST_30':
        d.setDate(d.getDate() - 30);
        return d;
      default:
        return null;
    }
  }

  private syncDraftFilters() {
    this.draftChildId = this.selectedChildId;
    this.draftType = this.selectedType;
    this.draftDate = this.selectedDate;
  }

  onChildDraftChange(ev: CustomEvent) {
    this.draftChildId = ev.detail.value;
  }

  onTypeDraftChange(ev: CustomEvent) {
    this.draftType = ev.detail.value;
  }

  onDraftDateChange(ev: CustomEvent) {
    this.draftDate = ev.detail.value || null;
  }

  clearDraftDate() {
    this.draftDate = null;
  }

  onApplyFilters(modal: any) {
    this.selectedChildId = this.draftChildId;
    this.selectedType = this.draftType;
    this.selectedDate = this.draftDate;
    this.applyFilters();
    modal.dismiss();
  }

  onCancelFilters(modal: any) {
    this.syncDraftFilters(); // vuelve a lo aplicado
    modal.dismiss();
  }

  get totalSpent(): number {
    return this.filteredItems
      .filter(i => i.type === 'SALE')
      .reduce((acc, i) => acc + i.amountCents, 0);
  }

  get totalTopup(): number {
    return this.filteredItems
      .filter(i => i.type === 'TOPUP')
      .reduce((acc, i) => acc + i.amountCents, 0);
  }

  get hasActiveFilters(): boolean {
    return !(
      this.selectedChildId === 'all' &&
      this.selectedType === 'ALL' &&
      this.selectedDate === null
    );
  }

  get filtersSummary(): string {
    const parts: string[] = [];

    // hijo
    if (this.selectedChildId === 'all') {
      parts.push('todos los hijos');
    } else {
      const child = this.childOptions.find(c => c.id === this.selectedChildId);
      parts.push(child ? child.name : 'un hijo');
    }

    // tipo
    if (this.selectedType === 'SALE') parts.push('solo gastos');
    if (this.selectedType === 'TOPUP') parts.push('solo recargas');

    // fecha
    switch (this.selectedDate) {
      case 'TODAY': parts.push('hoy'); break;
      case 'LAST_7': parts.push('últimos 7 días'); break;
      case 'LAST_30': parts.push('últimos 30 días'); break;
    }

    return parts.join(' · ');
  }

  goBack() {
    this.location.back();
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

}
