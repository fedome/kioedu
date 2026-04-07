import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface CloseShiftDto {
  countedCash: number; // En centavos
  closingNote?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftsService {
  private api = inject(ApiService);

  /**
   * Obtiene el resumen actual (Ventas, Movimientos, Saldo inicial)
   */
  getSummary() {
    return this.api.get<any>('/cash-sessions/summary');
  }

  /**
   * Cierra la caja
   */
  closeSession(dto: CloseShiftDto): Observable<any> {
    return this.api.post('/cash-sessions/close', dto);
  }

  /**
   * Agrega un movimiento manual (Retiro/Ingreso/Gasto)
   */
  addMovement(kind: 'IN' | 'OUT' | 'DROP', amount: number, note: string) {
    return this.api.post('/cash-sessions/cash-movement', { kind, amount, note });
  }
}
