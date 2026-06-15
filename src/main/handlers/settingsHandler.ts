import { IPC_CHANNELS, AppSettings } from '../../shared/types';
import * as CryptoJS from 'crypto-js';

const SECRET_KEY = 'pdf-cabinet-secure-key-2024';

function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function registerSettingsHandlers(ipcMain: any, db: any, app: any) {
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    try {
      const rows = db.all('SELECT key, value FROM settings');
      const settingsMap: Record<string, string> = {};
      for (const row of rows) {
        if (row.key !== 'encryption_key') {
          try {
            settingsMap[row.key] = decrypt(row.value);
          } catch {
            settingsMap[row.key] = row.value;
          }
        } else {
          settingsMap[row.key] = row.value;
        }
      }

      const settings: AppSettings = {
        encryptionKey: settingsMap.encryption_key || '',
        theme: (settingsMap.theme as any) || 'light',
        defaultColor: settingsMap.defaultColor || '#1e3a5f',
        autoSave: settingsMap.autoSave !== 'false',
        openLastDocuments: settingsMap.openLastDocuments !== 'false',
      };

      return { success: true, data: settings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event: any, newSettings: Partial<AppSettings>) => {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      
      const updateSetting = (key: string, value: any) => {
        stmt.run(key, encrypt(String(value)));
      };

      if (newSettings.theme !== undefined) updateSetting('theme', newSettings.theme);
      if (newSettings.defaultColor !== undefined) updateSetting('defaultColor', newSettings.defaultColor);
      if (newSettings.autoSave !== undefined) updateSetting('autoSave', newSettings.autoSave);
      if (newSettings.openLastDocuments !== undefined) updateSetting('openLastDocuments', newSettings.openLastDocuments);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
