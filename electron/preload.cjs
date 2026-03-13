const { contextBridge, ipcRenderer } = require('electron');

// We gebruiken contextBridge om functies veilig bloot te stellen aan de renderer (React)
// zonder dat we nodeIntegration hoeven aan te zetten.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: '1.4.5',
  // Handig voor debugging of desktop-specifieke UI tweaks
  isDesktop: true,
  // Voorbeeld voor toekomstige uitbreiding: native bestandsselectie of notificaties
  sendNotification: (title, body) => ipcRenderer.send('notify', { title, body })
});

console.log('Projectdroid Desktop Bridge geïnitialiseerd.');