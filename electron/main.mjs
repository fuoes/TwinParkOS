import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let backendServer;

async function startBackend() {
  process.env.API_HOST = '127.0.0.1';
  process.env.API_PORT = '0';
  process.env.TWINPARK_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.TWINPARK_STATIC_DIR = path.join(__dirname, '..', 'dist');

  const backend = await import('../server/index.js');
  backendServer = backend.server;
  const address = await backend.listening;
  const port = typeof address === 'object' && address ? address.port : Number(process.env.API_PORT || 3001);
  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  const appUrl = await startBackend();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: 'TwinParkOS',
    backgroundColor: '#eef4f2',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(() => {
  createWindow().catch((error) => {
    dialog.showErrorBox('TwinParkOS 启动失败', error?.stack || String(error));
    app.quit();
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      dialog.showErrorBox('TwinParkOS 启动失败', error?.stack || String(error));
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendServer?.listening) backendServer.close();
});
