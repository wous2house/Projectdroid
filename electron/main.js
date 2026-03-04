import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
// Importeer de server direct
import { startServer } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let activeServer;

const SERVER_PORT = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 768,
    title: "Projectdroid Professional",
    icon: path.join(app.getAppPath(), 'logo.png'),
    backgroundColor: '#020817',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  // Bepaal de URL: Dev server van Vite of de lokale Express server
  const url = `http://localhost:${SERVER_PORT}`;

  mainWindow.loadURL(url).catch(err => {
    console.error('Fout bij laden URL:', err);
    // Retry na 1 seconde als de server nog niet klaar is
    setTimeout(() => mainWindow.loadURL(url), 1000);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (app.isPackaged) {
    mainWindow.setMenuBarVisibility(false);
  }

  // CSP instellen - BELANGRIJK: https://webdroids.nl en https://images.unsplash.com toegevoegd aan img-src
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://localhost:3000 http://localhost:5173; " +
          "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https://api.dicebear.com https://esm.sh https://webdroids.nl https://images.unsplash.com; " +
          "connect-src 'self' https://* http://localhost:* ws://localhost:* https://esm.sh https://generativelanguage.googleapis.com;"
        ]
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Start de server direct in het hoofdproces
    try {
      activeServer = await startServer({
        PORT: SERVER_PORT,
        PROJECTDROID_DATA_PATH: app.getPath('userData'),
        isProduction: app.isPackaged
      });
      console.log('[Electron] Interne server succesvol gestart.');
    } catch (err) {
      console.error('[Electron] Server start fout:', err);
    }
    
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (activeServer) activeServer.close();
    app.quit();
  }
});