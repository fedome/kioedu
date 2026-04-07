import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { KioskBootstrapService } from './kiosk-bootstrap.service';
import { ApiService } from '../api/api.service';
import { firstValueFrom } from 'rxjs';

// Interfaz del Usuario Cajero
export interface CashierUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  kioskId: number;
  schoolId: number;
}

// Respuesta del Backend (ajustada con lo que agregamos)
type CashierLoginResp = {
  cashier_token: string;
  kioskId: number;
  userId: number;
  schoolId: number;
  expiresAt: string;
  name: string;
  roles: string[]; // <--- Cambiado a plural
};

@Injectable({ providedIn: 'root' })
export class CashierAuthService {
  private kiosk = inject(KioskBootstrapService);
  private api = inject(ApiService);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'cashier_token';
  private readonly USER_KEY = 'cashier_user';

  // --- STATE (SIGNALS) ---
  // Esto permite que el Header, el Modal y los Guards reaccionen automáticamente
  currentUser = signal<CashierUser | null>(this.getUserFromStorage());

  // Computed: Para saber fácil si está logueado
  isAuthenticated = computed(() => !!this.currentUser());

  private isPersistentSession = false; // Flag interno

  // --- INACTIVITY TIMER ---
  private inactivityTimeout: any;
  private readonly DEFAULT_TIMEOUT_MS = 60 * 60 * 1000; // 60 Minutos
  private readonly PERSISTENT_TIMEOUT_MS = 20 * 24 * 60 * 60 * 1000; // 20 Días (Límite setTimeout < 2.1bn ms)

  constructor() {
    this.isPersistentSession = !!localStorage.getItem(this.USER_KEY);
    // Si al iniciar ya hay usuario, arrancamos el timer
    if (this.currentUser()) {
      this.resetInactivityTimer();
    }
  }

  get cashierToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Reinicia el contador de inactividad.
   * Debe ser llamado por el Shell ante eventos del usuario (clicks, teclas).
   */
  resetInactivityTimer() {
    if (!this.currentUser()) return; // Solo si está logueado

    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);

    const timeout = this.isPersistentSession ? this.PERSISTENT_TIMEOUT_MS : this.DEFAULT_TIMEOUT_MS;

    this.inactivityTimeout = setTimeout(() => {
      console.warn('⚠️ Logout por inactividad');
      this.logout();
    }, timeout);
  }

  /**
   * Login: Obtiene token + datos del usuario
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    try {
      const kioskToken = await this.kiosk.ensureKioskToken();

      // Hacemos el request
      const resp = await this.doLoginRequest(email, password, kioskToken);

      this.handleLoginSuccess(resp, email, rememberMe);


    } catch (e: any) {
      if (e?.status === 401) {
        // Si falla por token de Kiosco vencido, reintentamos una vez
        const newToken = await this.kiosk.ensureKioskToken(true);
        const resp = await this.doLoginRequest(email, password, newToken);
        this.handleLoginSuccess(resp, email, rememberMe);
        return;
      }
      throw e;
    }
  }

  /**
   * Logout: Limpia storage y estado.
   * @param wipeLocalData Si es true, borra TODA la BD local (IndexedDB).
   */
  logout(wipeLocalData: boolean = false) {
    // 1. Limpiar Storage (Ambos)
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    this.currentUser.set(null);
    this.isPersistentSession = false;


    // 2. Limpiar Timer
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);

    // 3. (Opcional) Borrar datos locales
    if (wipeLocalData) {
      // Inyección dinámica o servicio helper para no circular dependency
      // Por simplicidad, asumimos que el usuario lo pide explícitamente y recargamos
      // Ojo: Dexie.delete('PosKioscoDB') retorna promesa.
      // Lo ideal sería llamar a LocalDbService.clearAll(), pero aquí haremos un hard reload.
      indexedDB.deleteDatabase('PosKioscoDB');
      localStorage.clear(); // Borra lastSync dates también
      console.log('🧹 DATOS BORRADOS (Factory Reset)');
    }

    this.router.navigate(['/login']);
  }

  /**
   * Verifica si el usuario tiene un rol específico (Útil para Guards)
   */
  hasRole(allowedRoles: string[]): boolean {
    const user = this.currentUser();
    if (!user || !user.roles) return false;
    return user.roles.some(r => allowedRoles.includes(r));
  }

  // --- PRIVADOS ---

  private async doLoginRequest(email: string, pass: string, token: string) {
    return firstValueFrom(
      this.api.post<CashierLoginResp>(
        `/pos/cashier/login`,
        { email, password: pass },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );
  }

  private handleLoginSuccess(resp: CashierLoginResp, email: string, rememberMe: boolean) {
    this.isPersistentSession = rememberMe;
    const storage = rememberMe ? localStorage : sessionStorage;

    // 1. Guardar Token
    storage.setItem(this.TOKEN_KEY, resp.cashier_token);

    // 2. Construir objeto usuario
    const user: CashierUser = {
      id: resp.userId,
      name: resp.name,
      email: email,
      roles: resp.roles, // Viene del back como array
      kioskId: resp.kioskId,
      schoolId: resp.schoolId
    };

    // 3. Guardar Usuario y actualizar Signal
    storage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);

    // 4. Iniciar Timer
    this.resetInactivityTimer();
  }

  private getUserFromStorage(): CashierUser | null {
    const stored = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
    if (!stored) return null;

    // Si estaba en localStorage, marcamos como persistente para el timer
    if (localStorage.getItem(this.USER_KEY)) {
      this.isPersistentSession = true;
    }

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}
