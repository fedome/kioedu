// src/app/interfaces/child.interface.ts

export type DocumentType = 'DNI' | 'CUIT' | 'CUIL' | 'PASSPORT';
export type Role = 'PARENT' | 'CASHIER' | 'ADMIN' | 'ENCARGADO';

// Resumen de escuela que viene embebido en el child
export interface SchoolSummary {
  id: number;
  name: string;
}

// Resumen de cuenta del alumno
export interface AccountSummary {
  id: number;
  balanceCents: number;
}

// Límite diario actual (modelo DailyLimit)
export interface DailyLimitSummary {
  childId: number;
  limitCents: number;
  spentTodayCents?: number; // 👈 NUEVO: Calculado en front o enviado por back
  updatedAt: string; // ISO
}

export interface ChildCard {
  readonly uidHex: string;
  readonly isBlocked: boolean;
}

export interface ChildView extends Child {
  hasCard: boolean;
}

export interface Child {
  id: number;
  firstName: string;
  lastName: string;

  documentType?: DocumentType;
  documentNumber?: string;

  dateOfBirth?: string; // ISO string (Date en back)
  grade?: string;       // curso
  division?: string;    // división

  school?: SchoolSummary;
  accounts?: AccountSummary[];
  dailyLimit?: DailyLimitSummary;

  card?: ChildCard | null;  // 👈 NUEVO
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: Role;
  children: Child[];
}
