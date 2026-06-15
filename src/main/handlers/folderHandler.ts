import * as crypto from 'crypto';
import { IPC_CHANNELS, Folder } from '../../shared/types';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function registerFolderHandlers(ipcMain: any, db: any) {
  ipcMain.handle(IPC_CHANNELS.CREATE_FOLDER, (_event: any, folder: Partial<Folder>) => {
    try {
      const now = Date.now();
      const id = generateId();
      const name = folder.name || '新建文件夹';
      const parentId = folder.parentId || null;
      const color = folder.color || '#1e3a5f';
      const order = folder.order ?? 0;

      db.run(
        'INSERT INTO folders (id, name, parent_id, color, created_at, "order") VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, parentId, color, now, order]
      );

      const created: Folder = {
        id,
        name,
        parentId,
        color,
        createdAt: now,
        order,
      };

      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_FOLDER, (_event: any, id: string, updates: Partial<Folder>) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.parentId !== undefined) {
        fields.push('parent_id = ?');
        values.push(updates.parentId);
      }
      if (updates.color !== undefined) {
        fields.push('color = ?');
        values.push(updates.color);
      }
      if (updates.order !== undefined) {
        fields.push('"order" = ?');
        values.push(updates.order);
      }

      if (fields.length > 0) {
        values.push(id);
        db.run(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_FOLDER, (_event: any, id: string) => {
    try {
      if (id === 'default-folder') {
        return { success: false, error: '不能删除默认文件夹' };
      }
      db.run('DELETE FROM folders WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_FOLDERS, () => {
    try {
      const rows = db.all('SELECT * FROM folders ORDER BY "order" ASC, created_at ASC');
      const folders: Folder[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        color: row.color,
        createdAt: row.created_at,
        order: row.order,
      }));
      return { success: true, data: folders };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
