import * as crypto from 'crypto';
import { IPC_CHANNELS, Annotation } from '../../shared/types';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function registerAnnotationHandlers(ipcMain: any, db: any) {
  ipcMain.handle(IPC_CHANNELS.CREATE_ANNOTATION, (_event: any, annotation: Partial<Annotation>) => {
    try {
      const now = Date.now();
      const id = annotation.id || generateId();
      const pdfId = annotation.pdfId!;
      const pageNumber = annotation.pageNumber || 1;
      const type = annotation.type || 'highlight';
      const content = annotation.content || '';
      const color = annotation.color || '#ffff00';
      const rect = annotation.rect || [];
      const author = annotation.author || '我';

      db.run(
        `INSERT INTO annotations 
         (id, pdf_id, page_number, type, content, color, rect_data, created_at, updated_at, author) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, pdfId, pageNumber, type, content, color, JSON.stringify(rect), now, now, author]
      );

      const created: Annotation = {
        id, pdfId, pageNumber, type, content, color, rect,
        createdAt: now, updatedAt: now, author,
      };

      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_ANNOTATION, (_event: any, id: string, updates: Partial<Annotation>) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
      if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
      if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
      if (updates.rect !== undefined) { fields.push('rect_data = ?'); values.push(JSON.stringify(updates.rect)); }
      if (updates.pageNumber !== undefined) { fields.push('page_number = ?'); values.push(updates.pageNumber); }
      if (updates.author !== undefined) { fields.push('author = ?'); values.push(updates.author); }

      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(Date.now(), id);
        db.run(`UPDATE annotations SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ANNOTATION, (_event: any, id: string) => {
    try {
      db.run('DELETE FROM annotations WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_ANNOTATIONS, (_event: any, filters: any = {}) => {
    try {
      let sql = 'SELECT a.*, p.file_name as pdf_name FROM annotations a LEFT JOIN pdf_documents p ON a.pdf_id = p.id WHERE 1=1';
      const params: any[] = [];

      if (filters.pdfId) {
        sql += ' AND a.pdf_id = ?';
        params.push(filters.pdfId);
      }
      if (filters.type) {
        sql += ' AND a.type = ?';
        params.push(filters.type);
      }

      sql += ' ORDER BY a.created_at DESC';
      const rows = db.all(sql, params);

      const annotations = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pageNumber: row.page_number,
        type: row.type,
        content: row.content,
        color: row.color,
        rect: JSON.parse(row.rect_data || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        author: row.author,
        pdfName: row.pdf_name,
      }));

      return { success: true, data: annotations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_ANNOTATIONS_BY_PDF, (_event: any, pdfId: string) => {
    try {
      const rows = db.all(
        'SELECT * FROM annotations WHERE pdf_id = ? ORDER BY page_number ASC, created_at ASC',
        [pdfId]
      );

      const annotations: Annotation[] = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pageNumber: row.page_number,
        type: row.type,
        content: row.content,
        color: row.color,
        rect: JSON.parse(row.rect_data || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        author: row.author,
      }));

      return { success: true, data: annotations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
