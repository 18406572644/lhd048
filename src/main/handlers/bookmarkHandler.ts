import * as crypto from 'crypto';
import * as fs from 'fs';
import { IPC_CHANNELS, Bookmark } from '../../shared/types';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function registerBookmarkHandlers(ipcMain: any, db: any) {
  ipcMain.handle(IPC_CHANNELS.CREATE_BOOKMARK, (_event: any, bookmark: Partial<Bookmark>) => {
    try {
      const now = Date.now();
      const id = bookmark.id || generateId();
      const pdfId = bookmark.pdfId!;
      const pageNumber = bookmark.pageNumber || 1;
      const title = bookmark.title || '未命名书签';
      const description = bookmark.description || '';
      const color = bookmark.color || '#1e3a5f';
      const tags = bookmark.tags || [];
      const category = bookmark.category || '自定义';
      const position = bookmark.position || { top: 0, left: 0, zoom: 1 };
      const isImported = bookmark.isImported ? 1 : 0;

      db.run(
        `INSERT INTO bookmarks 
         (id, pdf_id, page_number, title, description, color, tags, category, 
          created_at, updated_at, position_data, is_imported) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, pdfId, pageNumber, title, description, color,
          JSON.stringify(tags), category, now, now,
          JSON.stringify(position), isImported,
        ]
      );

      const created: Bookmark = {
        id, pdfId, pageNumber, title, description, color, tags,
        category, createdAt: now, updatedAt: now, position,
        isImported: !!isImported,
      };

      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_BOOKMARK, (_event: any, id: string, updates: Partial<Bookmark>) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.pageNumber !== undefined) { fields.push('page_number = ?'); values.push(updates.pageNumber); }
      if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
      if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
      if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
      if (updates.position !== undefined) { fields.push('position_data = ?'); values.push(JSON.stringify(updates.position)); }

      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(Date.now(), id);
        db.run(`UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_BOOKMARK, (_event: any, id: string) => {
    try {
      db.run('DELETE FROM bookmarks WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_BOOKMARKS, (_event: any, filters: any = {}) => {
    try {
      let sql = 'SELECT b.*, p.file_name as pdf_name FROM bookmarks b LEFT JOIN pdf_documents p ON b.pdf_id = p.id WHERE 1=1';
      const params: any[] = [];

      if (filters.pdfId) {
        sql += ' AND b.pdf_id = ?';
        params.push(filters.pdfId);
      }
      if (filters.category) {
        sql += ' AND b.category = ?';
        params.push(filters.category);
      }
      if (filters.tag) {
        sql += ' AND b.tags LIKE ?';
        params.push(`%${filters.tag}%`);
      }

      sql += ' ORDER BY b.created_at DESC';
      const rows = db.all(sql, params);

      const bookmarks: Bookmark[] = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pageNumber: row.page_number,
        title: row.title,
        description: row.description,
        color: row.color,
        tags: JSON.parse(row.tags || '[]'),
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        position: JSON.parse(row.position_data || '{"top":0,"left":0,"zoom":1}'),
        isImported: !!row.is_imported,
        pdfName: row.pdf_name,
      }));

      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_BOOKMARKS_BY_PDF, (_event: any, pdfId: string) => {
    try {
      const rows = db.all(
        'SELECT * FROM bookmarks WHERE pdf_id = ? ORDER BY page_number ASC, created_at ASC',
        [pdfId]
      );

      const bookmarks: Bookmark[] = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pageNumber: row.page_number,
        title: row.title,
        description: row.description,
        color: row.color,
        tags: JSON.parse(row.tags || '[]'),
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        position: JSON.parse(row.position_data || '{"top":0,"left":0,"zoom":1}'),
        isImported: !!row.is_imported,
      }));

      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_BOOKMARKS, (_event: any, query: string, filters: any = {}) => {
    try {
      let sql = `SELECT b.*, p.file_name as pdf_name 
                 FROM bookmarks b 
                 LEFT JOIN pdf_documents p ON b.pdf_id = p.id 
                 WHERE (b.title LIKE ? OR b.description LIKE ?)`;
      const params: any[] = [`%${query}%`, `%${query}%`];

      if (filters.pdfId) {
        sql += ' AND b.pdf_id = ?';
        params.push(filters.pdfId);
      }
      if (filters.category) {
        sql += ' AND b.category = ?';
        params.push(filters.category);
      }
      if (filters.folderId) {
        sql += ' AND p.folder_id = ?';
        params.push(filters.folderId);
      }

      sql += ' ORDER BY b.updated_at DESC LIMIT 500';
      const rows = db.all(sql, params);

      const bookmarks = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pageNumber: row.page_number,
        title: row.title,
        description: row.description,
        color: row.color,
        tags: JSON.parse(row.tags || '[]'),
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        position: JSON.parse(row.position_data || '{"top":0,"left":0,"zoom":1}'),
        isImported: !!row.is_imported,
        pdfName: row.pdf_name,
      }));

      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_BOOKMARKS, (_event: any, bookmarkIds: string[], format: string, filePath: string) => {
    try {
      const placeholders = bookmarkIds.map(() => '?').join(',');
      const rows = db.all(
        `SELECT b.*, p.file_name as pdf_name, p.file_path as pdf_path 
         FROM bookmarks b 
         LEFT JOIN pdf_documents p ON b.pdf_id = p.id 
         WHERE b.id IN (${placeholders})
         ORDER BY p.file_name, b.page_number`,
        bookmarkIds
      );

      const bookmarks = rows.map(row => ({
        id: row.id,
        pdfName: row.pdf_name,
        pdfPath: row.pdf_path,
        pageNumber: row.page_number,
        title: row.title,
        description: row.description,
        color: row.color,
        tags: JSON.parse(row.tags || '[]'),
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      let content: string;

      if (format === 'json') {
        content = JSON.stringify(bookmarks, null, 2);
      } else if (format === 'csv') {
        content = 'PDF文件,页码,标题,描述,分类,颜色,标签,创建时间\n';
        for (const b of bookmarks) {
          content += `"${b.pdfName}","${b.pageNumber}","${b.title.replace(/"/g, '""')}","${b.description.replace(/"/g, '""')}","${b.category}","${b.color}","${b.tags.join('|')}",${new Date(b.createdAt).toLocaleString()}\n`;
        }
      } else {
        content = '# 书签导出\n\n';
        const groupedByPdf: Record<string, typeof bookmarks> = {};
        for (const b of bookmarks) {
          if (!groupedByPdf[b.pdfName]) groupedByPdf[b.pdfName] = [];
          groupedByPdf[b.pdfName].push(b);
        }
        for (const [pdfName, pdfBookmarks] of Object.entries(groupedByPdf)) {
          content += `## ${pdfName}\n\n`;
          for (const b of pdfBookmarks) {
            content += `### 第${b.pageNumber}页 - ${b.title}\n\n`;
            if (b.description) content += `> ${b.description}\n\n`;
            if (b.tags.length > 0) content += `**标签:** ${b.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
            content += `**分类:** ${b.category} | **颜色:** ${b.color}\n\n`;
            content += `---\n\n`;
          }
        }
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_BOOKMARKS, (_event: any, filePath: string, folderId: string | null) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const bookmarks = JSON.parse(content);
      const imported: string[] = [];
      const now = Date.now();

      const pdfMap = new Map<string, string>();
      const allPdfs = db.all('SELECT id, file_path, hash FROM pdf_documents');
      for (const pdf of allPdfs) {
        if (folderId) {
          const inFolder = db.get('SELECT folder_id FROM pdf_documents WHERE id = ?', [pdf.id]);
          if (inFolder && inFolder.folder_id === folderId) {
            pdfMap.set(pdf.file_path.toLowerCase(), pdf.id);
          }
        } else {
          pdfMap.set(pdf.file_path.toLowerCase(), pdf.id);
        }
      }

      for (const bm of bookmarks) {
        let pdfId = pdfMap.get((bm.pdfPath || '').toLowerCase());
        if (!pdfId && bm.pdfName) {
          for (const pdf of allPdfs) {
            const checkPdf = db.get('SELECT file_name FROM pdf_documents WHERE id = ?', [pdf.id]);
            if (checkPdf && checkPdf.file_name === bm.pdfName) {
              pdfId = pdf.id;
              break;
            }
          }
        }
        if (!pdfId) continue;

        const id = generateId();
        db.run(
          `INSERT INTO bookmarks 
           (id, pdf_id, page_number, title, description, color, tags, category, 
            created_at, updated_at, position_data, is_imported) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, pdfId, bm.pageNumber || 1, bm.title || '导入书签',
            bm.description || '', bm.color || '#1e3a5f',
            JSON.stringify(bm.tags || []), bm.category || '导入',
            now, now,
            JSON.stringify(bm.position || { top: 0, left: 0, zoom: 1 }),
            1,
          ]
        );
        imported.push(id);
      }

      return { success: true, data: { importedCount: imported.length, ids: imported } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
