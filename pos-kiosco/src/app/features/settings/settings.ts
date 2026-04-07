import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, AppSettings } from '../../core/services/settings.service';
import { UiService } from '../../core/services/ui.service';
import { NotificationService } from '../../core/services/notification.service';
import { InvoicingService, InvoicingConfig, ArcaStatus } from '../../core/services/invoicing.service';
import { CashierAuthService } from '../../core/auth/cashier-auth.service';
import { ThermalPrinterService } from '../../core/services/thermal-printer.service';

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
    activeTab = signal<'profile' | 'system' | 'arca'>('profile');

    setActiveTab(tab: 'profile' | 'system' | 'arca') {
        this.activeTab.set(tab);
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
}
