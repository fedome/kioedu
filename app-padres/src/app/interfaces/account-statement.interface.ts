// src/app/interfaces/account-statement.interface.ts

export type TransactionType =
  | 'SALE'
  | 'REFUND'
  | 'VOID'
  | 'TOPUP';

export type TransactionStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELED'
  | 'VOID';

export type MovementType = 'SALE' | 'TOPUP';

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET';

// Dirección contable del movimiento visto desde el alumno
export type MovementDirection = 'DEBIT' | 'CREDIT';

export interface AccountMovement {
  id: number;                 // Transaction.id
  childId: number;
  transactionType: TransactionType;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;

  amountCents: number;        // siempre POSITIVO
  direction: MovementDirection; // 'DEBIT' = consumo, 'CREDIT' = carga

  description: string;        // ej. "Compra en kiosco", "Carga desde web"
  createdAt: string;          // ISO: usá completedAt o startedAt en el back
  totalCents: number;
  type: MovementType;
  items?: any[];
}

export interface DailyLimitDto {
  childId: number;
  limitCents: number;
  updatedAt: string;
}
