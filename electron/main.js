import { app, BrowserWindow, systemPreferences } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function handlePermissions() {
  // macOS requires an explicit request for microphone access in packaged apps
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      console.log(`[Main Process] Current Microphone Status: ${status}`);

      if (status !== 'granted') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        console.log(`[Main Process] Microphone permission granted after request: ${granted}`);
      }
    } catch (err) {
      console.error('[Main Process] Error checking/requesting microphone access:', err);
    }
  } else {
    // Windows/Linux typically grant access by default or via the Renderer process
    console.log(`[Main Process] Platform is ${process.platform}, skipping native macOS permission prompt.`);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Ensure the browser engine treats the app as "secure" to allow microphone access
      sandbox: false 
    }
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    // Open DevTools automatically in dev
    win.webContents.openDevTools();
  } else {
    // In production, load the built index.html from the dist folder
    // This path assumes your structure is /electron/main.js and /dist/index.html
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await handlePermissions();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});