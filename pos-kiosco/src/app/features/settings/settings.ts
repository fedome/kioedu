import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SettingsService, AppSettings } from '../../core/services/settings.service';
import { UiService } from '../../core/services/ui.service';
import { NotificationService } from '../../core/services/notification.service';
import { InvoicingService, InvoicingConfig, ArcaStatus } from '../../core/services/invoicing.service';
import { CashierAuthService } from '../../core/auth/cashier-auth.service';
import { ThermalPrinterService } from '../../core/services/thermal-printer.service';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

interface PrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
    status: number;
}

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
    private settingsService = inject(SettingsService);
    private ui = inject(UiService);
    private notifications = inject(NotificationService);
    private invoicingService = inject(InvoicingService);
    public auth = inject(CashierAuthService);
    private thermalPrinterService = inject(ThermalPrinterService);
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    thermalPrinterConnected = signal(this.thermalPrinterService.isConnected);

    // Lista de impresoras
    printers = signal<PrinterInfo[]>([]);
    loadingPrinters = signal(false);
    testingPrinter = signal(false);

    // Formulario (copia local de settings para editar)
    formData: AppSettings = { ...this.settingsService.settings() };

    // Estado
    saved = signal(false);
    showAdvancedSmtp = false;
    showAdvancedPaths = false;
    activeTab = signal<'profile' | 'system' | 'arca' | 'payments'>('profile');

    setActiveTab(tab: 'profile' | 'system' | 'arca' | 'payments') {
        this.activeTab.set(tab);
        if (tab === 'payments') {
            this.loadMpConfig();
        }
    }

    // Facturación ARCA
    invoicingConfig = signal<InvoicingConfig>({
        isEnabled: false,
        cuit: null,
        fiscalCondition: 'MONOTRIBUTO',
        invoiceType: 11,
        salePoint: null,
        autoInvoice: false,
        minAmountCents: 0,
        environment: 'testing',
    });
    arcaStatus = signal<ArcaStatus | null>(null);
    loadingInvoicing = signal(false);
    savingInvoicing = signal(false);
    testingArca = signal(false);

    ngOnInit() {
        this.ui.setPageTitle('Configuración', 'Ajustes del sistema');
        this.loadPrinters();
        this.loadInvoicingConfig();

        // Verificar si venimos de la redirección de Mercado Pago
        const code = this.route.snapshot.queryParamMap.get('code');
        if (code) {
            this.handleMpCallback(code);
        }
    }

    async loadPrinters() {
        this.loadingPrinters.set(true);
        try {
            const list = await this.settingsService.getPrinters();
            this.printers.set(list);
        } catch (error) {
            this.notifications.error('Error', 'No se pudieron cargar las impresoras');
        } finally {
            this.loadingPrinters.set(false);
        }
    }

    async testPrinter() {
        this.testingPrinter.set(true);
        try {
            const result = await this.settingsService.testPrinter(this.formData.printerName);
            if (result.success) {
                this.notifications.success('Impresora OK', 'Revisa si salió el ticket de prueba');
            } else {
                this.notifications.error('Error de Impresión', result.error || 'No se pudo imprimir');
            }
        } finally {
            this.testingPrinter.set(false);
        }
    }

    async connectThermalPrinter() {
        const connected = await this.thermalPrinterService.connect();
        this.thermalPrinterConnected.set(connected);
    }

    saveSettings() {
        this.settingsService.saveSettings(this.formData);
        this.saved.set(true);
        this.notifications.success('Guardado', 'Configuración guardada correctamente');
        setTimeout(() => this.saved.set(false), 3000);
    }

    // ===== FACTURACIÓN ARCA =====

    async loadInvoicingConfig() {
        const schoolId = this.auth.currentUser()?.schoolId;
        if (!schoolId) return;

        this.loadingInvoicing.set(true);
        try {
            const config = await this.invoicingService.getConfig(schoolId);
            this.invoicingConfig.set(config);
        } catch (error) {
            console.error('Error loading invoicing config:', error);
        } finally {
            this.loadingInvoicing.set(false);
        }
    }

    async saveInvoicingConfig() {
        const schoolId = this.auth.currentUser()?.schoolId;
        if (!schoolId) return;

        this.savingInvoicing.set(true);
        try {
            const c = this.invoicingConfig();
            await this.invoicingService.updateConfig(schoolId, c);
            this.notifications.success('Facturación', 'Configuración fiscal guardada correctamente');
        } catch (error) {
            this.notifications.error('Error', 'No se pudo guardar la configuración fiscal');
        } finally {
            this.savingInvoicing.set(false);
        }
    }

    async testArcaConnection() {
        const schoolId = this.auth.currentUser()?.schoolId;
        if (!schoolId) return;

        this.testingArca.set(true);
        try {
            const status = await this.invoicingService.checkStatus(schoolId);
            this.arcaStatus.set(status);
            if (status.available) {
                this.notifications.success('ARCA', 'Conexión exitosa con ARCA');
            } else {
                this.notifications.error('ARCA', `Error: ${status.error}`);
            }
        } catch (error: any) {
            this.notifications.error('ARCA', 'No se pudo verificar la conexión');
        } finally {
            this.testingArca.set(false);
        }
    }

    onFiscalConditionChange(condition: string) {
        const config = this.invoicingConfig();
        if (condition === 'MONOTRIBUTO') {
            this.invoicingConfig.set({ ...config, fiscalCondition: condition, invoiceType: 11 });
        } else {
            this.invoicingConfig.set({ ...config, fiscalCondition: condition, invoiceType: 6 });
        }
    }

    updateInvoicingField(field: string, value: any) {
        this.invoicingConfig.set({ ...this.invoicingConfig(), [field]: value });
    }

    // Mercado Pago Info
    mpConfig = signal<{ isConfigured: boolean; publicKey?: string } | null>(null);
    loadingMp = signal(false);

    async loadMpConfig() {
        this.loadingMp.set(true);
        try {
            const info = await firstValueFrom(this.api.get<{ isConfigured: boolean; publicKey?: string }>('/mercadopago/info'));
            this.mpConfig.set(info);
        } catch (error) {
            console.error('Error loading MP info:', error);
        } finally {
            this.loadingMp.set(false);
        }
    }

    async connectWithMp() {
        this.loadingMp.set(true);
        try {
            const res = await firstValueFrom(this.api.get<{ url: string }>('/mercadopago/auth-url'));
            if (res.url) {
                // Abrir en popup para no perder el estado del POS
                const width = 600;
                const height = 700;
                const left = (window.screen.width / 2) - (width / 2);
                const top = (window.screen.height / 2) - (height / 2);
                
                const popup = window.open(
                    res.url, 
                    'MP_AUTH', 
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Monitorear si el popup se cierra o si recibimos el mensaje de éxito
                const checkPopup = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(checkPopup);
                        this.loadingMp.set(false);
                        this.loadMpConfig(); // Refrescar por si se completó
                    }
                }, 1000);
            }
        } catch (error) {
            this.notifications.error('Error', 'No se pudo iniciar la conexión con Mercado Pago');
            this.loadingMp.set(false);
        }
    }

    private async handleMpCallback(code: string) {
        this.activeTab.set('payments');
        this.loadingMp.set(true);
        this.notifications.info('DEBUG', `Código detectado: ${code.substring(0, 5)}...`);
        this.notifications.info('Mercado Pago', 'Finalizando la vinculación...');

        try {
            await firstValueFrom(this.api.post('/mercadopago/authorize', { code }));
            this.notifications.success('Mercado Pago', 'Cuenta vinculada correctamente');
            
            // Limpiar el query param de la URL
            this.router.navigate([], {
                queryParams: { code: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });

            await this.loadMpConfig();
        } catch (error) {
            this.notifications.error('Error', 'No se pudo completar la vinculación con Mercado Pago');
            console.error(error);
        } finally {
            this.loadingMp.set(false);
        }
    }
}
