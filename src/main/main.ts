import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Database } from './database';
import { registerPDFHandlers } from './handlers/pdfHandler';
import { registerFolderHandlers } from './handlers/folderHandler';
import { registerBookmarkHandlers } from './handlers/bookmarkHandler';
import { registerAnnotationHandlers } from './handlers/annotationHandler';
import { registerTagHandlers } from './handlers/tagHandler';
import { registerExportHandlers } from './handlers/exportHandler';
import { registerSettingsHandlers } from './handlers/settingsHandler';
import { registerProgressHandlers } from './handlers/progressHandler';

let mainWindow: BrowserWindow | null = null;
let db: Database;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#FAF8F5',
    title: 'PDF Cabinet - 文档管理',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'pdfcabinet.db');
  
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.init();
  return db;
}

app.whenReady().then(() => {
  db = initDatabase();
  
  registerPDFHandlers(ipcMain, db, dialog);
  registerFolderHandlers(ipcMain, db);
  registerBookmarkHandlers(ipcMain, db);
  registerAnnotationHandlers(ipcMain, db);
  registerTagHandlers(ipcMain, db);
  registerExportHandlers(ipcMain, db, dialog);
  registerSettingsHandlers(ipcMain, db, app);
  registerProgressHandlers(ipcMain, db);

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow?.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() || false;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
