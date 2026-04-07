const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  getConfig: () => ipcRenderer.invoke('kiosk:getConfig'),
  login: () => ipcRenderer.invoke('kiosk:login'),
});

contextBridge.exposeInMainWorld('printer', {
  getList: () => ipcRenderer.invoke('printer:getList'),
  print: (html, printerName, options) => ipcRenderer.invoke('printer:print', { html, printerName, options }),
  test: (printerName) => ipcRenderer.invoke('printer:test', printerName),
});

