import { Injectable } from '@angular/core';
import { UiNotificationsService } from './ui-notifications.service';
import { NotificationsService } from './notifications';
import { Child } from 'src/app/interfaces/child.interface';

export type MovementKind = 'SALE' | 'TOPUP';

@Injectable({ providedIn: 'root' })
export class NotificationEventsService {
  // $ 500 => 500 * 100
  private readonly LOW_BALANCE_THRESHOLD_CENTS = 50000;

  // Para no spamear saldo bajo a cada carga
  private readonly LOW_BALANCE_KEY = 'mk-notif-low-balance-v1';
  private lowBalanceState: Record<string, boolean> = {};

  constructor(
    private ui: UiNotificationsService,
    private prefs: NotificationsService,
  ) {
    try {
      const raw = localStorage.getItem(this.LOW_BALANCE_KEY);
      this.lowBalanceState = raw ? JSON.parse(raw) : {};
    } catch {
      this.lowBalanceState = {};
    }
  }

  private saveLowBalanceState() {
    try {
      localStorage.setItem(
        this.LOW_BALANCE_KEY,
        JSON.stringify(this.lowBalanceState),
      );
    } catch {
      // si falla localStorage, no rompemos la app
    }
  }

  // ---------- COMPRAS Y RECARGAS ----------

  notifyMovement(childName: string, amountCents: number, kind: MovementKind) {
    if (!this.prefs.isMovementsEnabled()) return;

    const amount = (amountCents / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const title =
      kind === 'SALE' ? 'Consume en kiosco' : 'Recarga realizada';

    const message =
      kind === 'SALE'
        ? `${childName} gastó $ ${amount}.`
        : `Se acreditaron $ ${amount} en la cuenta de ${childName}.`;

    // info porque es un evento “de negocio”
    this.ui.info(title, message);
  }

  // ---------- SALDO BAJO ----------

  checkLowBalanceForChildren(children: Child[]) {
    if (!this.prefs.isLowBalanceEnabled()) return;

    let touched = false;

    for (const child of children) {
      const balanceCents = child.accounts?.[0]?.balanceCents ?? null;
      if (balanceCents == null) continue;

      const id = String(child.id);
      const isBelow = balanceCents <= this.LOW_BALANCE_THRESHOLD_CENTS;

      if (isBelow && !this.lowBalanceState[id]) {
        this.fireLowBalance(child, balanceCents);
        this.lowBalanceState[id] = true;
        touched = true;
      }

      // si salió de “saldo bajo”, reseteamos el flag
      if (!isBelow && this.lowBalanceState[id]) {
        delete this.lowBalanceState[id];
        touched = true;
      }
    }

    if (touched) {
      this.saveLowBalanceState();
    }
  }

  private fireLowBalance(child: Child, balanceCents: number) {
    const fullName = `${child.firstName} ${child.lastName}`.trim();

    const balance = (balanceCents / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const min = (this.LOW_BALANCE_THRESHOLD_CENTS / 100).toLocaleString(
      'es-AR',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    );

    this.ui.warning(
      'Saldo bajo',
      `El saldo de ${fullName} está por debajo de $ ${min} (actual: $ ${balance}).`,
    );
  }

  // ---------- LÍMITE DIARIO ALCANZADO (hook futuro) ----------

  notifyLimitReached(childName: string, limitCents: number) {
    if (!this.prefs.isLimitReachedEnabled()) return;

    const limit = (limitCents / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    this.ui.warning(
      'Límite diario alcanzado',
      `${childName} llegó al límite diario de $ ${limit}.`,
    );
  }

  // ---------- NOVEDADES Y MEJORAS (future) ----------

  notifyNews(title: string, message: string) {
    if (!this.prefs.isNewsEnabled()) return;
    this.ui.info(title, message);
  }
}
