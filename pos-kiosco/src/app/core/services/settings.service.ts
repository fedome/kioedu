import { Injectable, signal } from '@angular/core';

export interface AppSettings {
    // Impresora
    printerName: string;

    // Información del Kiosco
    businessName: string;
    businessAddress: string;

    // Caja
    defaultOpeningBalance: number;
    requireVoidReason: boolean;

    // Sonidos
    playSoundOnSale: boolean;

    // WebSerial
    useWebSerialPrinter: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    printerName: '',
    businessName: 'KioEdu',
    businessAddress: '',
    defaultOpeningBalance: 0,
    requireVoidReason: true,
    playSoundOnSale: true,
    useWebSerialPrinter: false,
};

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private readonly STORAGE_KEY = 'app_settings';

    // Signal reactivo con la configuración
    settings = signal<AppSettings>(this.loadSettings());

    private loadSettings(): AppSettings {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Error al cargar configuración:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    saveSettings(newSettings: Partial<AppSettings>) {
        const updated = { ...this.settings(), ...newSettings };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        this.settings.set(updated);
    }

    // Getters de conveniencia
    get printerName(): string {
        return this.settings().printerName;
    }

    get businessName(): string {
        return this.settings().businessName;
    }

    get businessAddress(): string {
        return this.settings().businessAddress;
    }

    // Helpers para impresora
    async getPrinters(): Promise<any[]> {
        const printerApi = (window as any).printer;
        if (!printerApi?.getList) {
            console.warn('API de impresora no disponible (no estás en Electron)');
            return [];
        }
        return printerApi.getList();
    }

    async testPrinter(printerName?: string): Promise<{ success: boolean; error?: string }> {
        const printerApi = (window as any).printer;
        if (!printerApi?.test) {
            return { success: false, error: 'API de impresora no disponible' };
        }
        return printerApi.test(printerName || this.printerName);
    }
}
