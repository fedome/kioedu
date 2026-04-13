const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let cachedKioskSession = null; // { kiosk_token, expiresAt, kioskId, schoolId }
let mainWindow = null;

// ==================== CONFIGURACIÓN ====================

/**
 * Lee kiosk.json — la única fuente de verdad.
 * - En desarrollo: lee de src/assets/kiosk.json (raíz del proyecto)
 * - En producción: lee de resources/kiosk.json (empaquetado con la app)
 */
function readKioskConfig() {
  const isDev = !app.isPackaged;

  // En dev, subimos desde /electron al root del proyecto, luego src/assets
  const configPath = isDev
    ? path.join(__dirname, '..', 'src', 'assets', 'kiosk.json')
    : path.join(process.resourcesPath, 'kiosk.json');

  let cfg = {};
  try {
    let raw = fs.readFileSync(configPath, 'utf-8');
    raw = raw.replace(/^\uFEFF/, ''); // eliminar BOM
    cfg = JSON.parse(raw);
  } catch (e) {
    console.error('[CONFIG] No se pudo leer kiosk.json en:', configPath, e.message);
    // Fallback mínimo
    cfg = {
      apiBaseUrl: 'http://localhost:3000/api/v1',
      kioskApiKey: '',
      kioskId: 1,
    };
  }

  if (!cfg.apiBaseUrl || !cfg.kioskApiKey) {
    console.error('[CONFIG] ⚠️ Configuración incompleta — falta apiBaseUrl o kioskApiKey');
    console.error('[CONFIG] Ruta del archivo:', configPath);
  }

  console.log('[CONFIG] Fuente:', configPath);
  console.log('[CONFIG] Final:', JSON.stringify({ apiBaseUrl: cfg.apiBaseUrl, kioskId: cfg.kioskId }));
  return cfg;
}

function getKioskConfigPath() {
  const isDev = !app.isPackaged;
  return isDev
    ? path.join(__dirname, '..', 'src', 'assets', 'kiosk.json')
    : path.join(process.resourcesPath, 'kiosk.json');
}

// ==================== KIOSK LOGIN ====================

async function kioskLogin() {
  // Si hay token vigente, devolvemos cache
  if (cachedKioskSession?.kiosk_token && cachedKioskSession?.expiresAt) {
    const exp = new Date(cachedKioskSession.expiresAt).getTime();
    if (Date.now() < exp - 10_000) return cachedKioskSession;
  }

  const cfg = readKioskConfig();
  const apiBaseUrl = cfg.apiBaseUrl;

  const res = await fetch(`${apiBaseUrl}/pos/session/login`, {
    method: 'POST',
    headers: {
      'X-Kiosk-Key': cfg.kioskApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Kiosk login falló (${res.status}): ${txt}`);
  }

  const data = await res.json();
  cachedKioskSession = data;
  return data;
}

// ==================== VENTANA ====================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // DEV
  mainWindow.loadURL('http://localhost:4200');

  // PROD (cuando empaquetes)
  // mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'pos-kiosco', 'browser', 'index.html'));
}

// ==================== IPC HANDLERS ====================

ipcMain.handle('kiosk:getConfig', async () => {
  const cfg = readKioskConfig();
  const configPath = getKioskConfigPath();
  return {
    apiBaseUrl: cfg.apiBaseUrl,
    configPath,
  };
});

ipcMain.handle('kiosk:login', async () => {
  return kioskLogin();
});

// ==================== PRINTER HANDLERS ====================

ipcMain.handle('printer:getList', async () => {
  try {
    if (!mainWindow) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status
    }));
  } catch (error) {
    console.error('Error al obtener impresoras:', error);
    return [];
  }
});

ipcMain.handle('printer:print', async (event, { html, printerName, options = {} }) => {
  return new Promise((resolve, reject) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        width: 300,
        height: 600,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', () => {
        const printOptions = {
          silent: true,
          printBackground: true,
          deviceName: printerName || '',
          margins: { marginType: 'none' },
          ...options
        };

        printWindow.webContents.print(printOptions, (success, failureReason) => {
          printWindow.close();
          resolve({ success, error: success ? undefined : failureReason });
        });
      });

      printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        printWindow.close();
        resolve({ success: false, error: errorDescription });
      });

    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

ipcMain.handle('printer:test', async (event, printerName) => {
  const testHtml = `
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 10px; width: 48mm; margin: 0; padding: 3px; }
          .center { text-align: center; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <strong>Prueba de Impresión</strong>
          <p>MiKioscoEdu</p>
        </div>
        <div class="line"></div>
        <p>Impresora: ${printerName || 'Defecto'}</p>
        <p>Fecha: ${new Date().toLocaleString('es-AR')}</p>
        <div class="line"></div>
        <p class="center">Impresora OK!</p>
      </body>
    </html>
  `;

  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 300,
      height: 400,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || '',
        margins: { marginType: 'none' }
      }, (success, failureReason) => {
        printWindow.close();
        resolve({ success, error: failureReason });
      });
    });
  });
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
