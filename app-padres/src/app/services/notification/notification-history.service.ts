import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type HistoryNotificationKind =
  | 'MOVEMENT'      // compras / recargas
  | 'LOW_BALANCE'   // saldo bajo
  | 'LIMIT_REACHED' // límite diario alcanzado
  | 'NEWS';         // novedades (si la usás)

export interface HistoryNotification {
  id: string;
  kind: HistoryNotificationKind;
  title: string;
  message: string;
  createdAt: string; // ISO
  read: boolean;

  // Datos extras para futuro (no obligatorio)
  childName?: string;
  amountCents?: number;
  type?: 'SALE' | 'TOPUP';
  limitCents?: number;
  balanceCents?: number;
}

type HistoryFilter = 'ALL' | 'ACCOUNT' | 'NEWS';

const STORAGE_KEY = 'mk-notifications-history';

function generateId(): string {
  // usar crypto.randomUUID si está disponible
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

@Injectable({ providedIn: 'root' })
export class NotificationHistoryService {
  private subject = new BehaviorSubject<HistoryNotification[]>([]);
  notifications$ = this.subject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  // ---------- CRUD básico ----------

  add(input: Omit<HistoryNotification, 'id' | 'read' | 'createdAt'> & {
    createdAt?: string;
    read?: boolean;
  }) {
    const now = new Date();
    const notif: HistoryNotification = {
      id: generateId(),
      read: input.read ?? false,
      createdAt: input.createdAt ?? now.toISOString(),
      ...input,
    };

    const list = this.subject.value;
    const newList = [notif, ...list]; // más nuevas arriba
    this.subject.next(newList);
    this.saveToStorage(newList);
  }

  markAsRead(id: string) {
    const newList = this.subject.value.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.subject.next(newList);
    this.saveToStorage(newList);
  }

  markAllAsRead() {
    const newList = this.subject.value.map((n) =>
      n.read ? n : { ...n, read: true }
    );
    this.subject.next(newList);
    this.saveToStorage(newList);
  }

  remove(id: string) {
    const newList = this.subject.value.filter((n) => n.id !== id);
    this.subject.next(newList);
    this.saveToStorage(newList);
  }

  clear() {
    this.subject.next([]);
    this.saveToStorage([]);
  }

  // ---------- Helpers de dominio ----------

  addMovement(params: {
    childName: string;
    amountCents: number;
    type: 'SALE' | 'TOPUP';
  }) {
    const amount = (params.amountCents / 100).toFixed(2);

    const title =
      params.type === 'SALE' ? 'Compra en kiosco' : 'Recarga de saldo';

    const message =
      params.type === 'SALE'
        ? `${params.childName} gastó $ ${amount}.`
        : `Se acreditó $ ${amount} en la cuenta de ${params.childName}.`;

    this.add({
      kind: 'MOVEMENT',
      title,
      message,
      childName: params.childName,
      amountCents: params.amountCents,
      type: params.type,
    });
  }

  addLowBalance(params: { childName: string; balanceCents: number }) {
    const balance = (params.balanceCents / 100).toFixed(2);

    this.add({
      kind: 'LOW_BALANCE',
      title: 'Saldo bajo',
      message: `El saldo de ${params.childName} es $ ${balance}.`,
      childName: params.childName,
      balanceCents: params.balanceCents,
    });
  }

  addLimitReached(params: { childName: string; limitCents: number }) {
    const limit = (params.limitCents / 100).toFixed(2);

    this.add({
      kind: 'LIMIT_REACHED',
      title: 'Límite diario alcanzado',
      message: `${params.childName} alcanzó el límite diario de $ ${limit}.`,
      childName: params.childName,
      limitCents: params.limitCents,
    });
  }

  addNews(params: { title: string; message: string }) {
    this.add({
      kind: 'NEWS',
      title: params.title,
      message: params.message,
    });
  }

  // ---------- Persistencia local ----------

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryNotification[];
      // ordenar por fecha desc por las dudas
      parsed.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      this.subject.next(parsed);
    } catch (err) {
      console.warn('[History] Error leyendo localStorage', err);
    }
  }

  private saveToStorage(list: HistoryNotification[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[History] Error guardando localStorage', err);
    }
  }
}
