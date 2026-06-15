import * as crypto from 'crypto';
import { IPC_CHANNELS, Tag } from '../../shared/types';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function registerTagHandlers(ipcMain: any, db: any) {
  ipcMain.handle(IPC_CHANNELS.CREATE_TAG, (_event: any, tag: Partial<Tag>) => {
    try {
      const now = Date.now();
      const id = generateId();
      const name = tag.name || '新标签';
      const color = tag.color || '#1e3a5f';

      const existing = db.get('SELECT id FROM tags WHERE name = ?', [name]);
      if (existing) {
        return { success: false, error: '标签名已存在' };
      }

      db.run(
        'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [id, name, color, now]
      );

      const created: Tag = { id, name, color, createdAt: now };
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TAG, (_event: any, id: string, updates: Partial<Tag>) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        const existing = db.get('SELECT id FROM tags WHERE name = ? AND id != ?', [updates.name, id]);
        if (existing) {
          return { success: false, error: '标签名已存在' };
        }
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.color !== undefined) {
        fields.push('color = ?');
        values.push(updates.color);
      }

      if (fields.length > 0) {
        values.push(id);
        db.run(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TAG, (_event: any, id: string) => {
    try {
      db.run('DELETE FROM tags WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_TAGS, () => {
    try {
      const rows = db.all('SELECT * FROM tags ORDER BY created_at ASC');
      const tags: Tag[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
      }));
      return { success: true, data: tags };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
