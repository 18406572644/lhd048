import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { IPC_CHANNELS, PDFDocument } from '../../shared/types';

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

export async function parsePDFFile(filePath: string): Promise<{ totalPages: number }> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(dataBuffer);
    
    const matches = /\/Type\s*\/Pages[^]*?\/Count\s*(\d+)/g;
    const str = Buffer.from(data).toString('latin1');
    let maxCount = 0;
    let match;
    
    while ((match = matches.exec(str)) !== null) {
      const count = parseInt(match[1], 10);
      if (count > maxCount) maxCount = count;
    }
    
    if (maxCount === 0) {
      const pageMatches = str.match(/\/Type\s*\/Page(?!s)/g);
      maxCount = pageMatches ? pageMatches.length : 1;
    }
    
    return { totalPages: Math.max(1, maxCount) };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return { totalPages: 1 };
  }
}

export async function extractBookmarksFromPDF(filePath: string): Promise<any[]> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const content = dataBuffer.toString('latin1');
    const bookmarks: any[] = [];
    
    const outlineRegex = /\/Title\s*\(([^)]+)\)[^/]*?\/Dest\s*\[([^\]]+)\]/g;
    const pageRefRegex = /(\d+)\s+\d+\s+R/g;
    
    let match;
    let pageNum = 1;
    
    while ((match = outlineRegex.exec(content)) !== null) {
      const title = match[1];
      const dest = match[2];
      
      const pageMatch = pageRefRegex.exec(dest);
      if (pageMatch) {
        const refNum = parseInt(pageMatch[1], 10);
        pageNum = Math.max(1, Math.min(refNum, 10000));
      }
      
      bookmarks.push({
        id: generateId(),
        title: title || '未命名书签',
        pageNumber: pageNum,
        description: '',
        color: '#1e3a5f',
        tags: [],
        category: '导入',
        position: { top: 0, left: 0, zoom: 1 },
        isImported: true,
      });
    }
    
    return bookmarks;
  } catch (error) {
    console.error('Error extracting bookmarks:', error);
    return [];
  }
}

export async function extractAnnotationsFromPDF(filePath: string): Promise<any[]> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const content = dataBuffer.toString('latin1');
    const annotations: any[] = [];
    
    const annotRegex = /\/Subtype\s*\/(\w+)[^]*?\/Contents\s*\(([^)]*)\)[^]*?\/Rect\s*\[([^\]]+)\][^]*?\/C\s*\[([^\]]+)\]/g;
    const pageAnnotRegex = /\/Annots\s*\[([^\]]+)\]/g;
    
    let annotMatch;
    let pageNum = 1;
    const pageRefs = new Map<string, number>();
    
    let pageMatch;
    let count = 1;
    const pageObjRegex = /(\d+)\s+\d+\s+obj[^]*?\/Type\s*\/Page(?!s)/g;
    while ((pageMatch = pageObjRegex.exec(content)) !== null) {
      pageRefs.set(pageMatch[1] + ' 0 R', count);
      count++;
    }
    
    while ((annotMatch = annotRegex.exec(content)) !== null) {
      const [, subtype, contents, rect, color] = annotMatch;
      const rectParts = rect.split(/\s+/).map(Number);
      const colorParts = color.split(/\s+/).map(Number);
      
      const colorHex = colorParts.length >= 3 
        ? `#${colorParts.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
        : '#ffff00';
      
      let type: 'highlight' | 'underline' | 'strikeout' | 'text' | 'squiggly' = 'highlight';
      if (subtype === 'Highlight') type = 'highlight';
      else if (subtype === 'Underline') type = 'underline';
      else if (subtype === 'StrikeOut') type = 'strikeout';
      else if (subtype === 'Text') type = 'text';
      else if (subtype === 'Squiggly') type = 'squiggly';
      
      annotations.push({
        id: generateId(),
        pageNumber: pageNum,
        type,
        content: contents || '',
        color: colorHex,
        rect: rectParts,
        author: '原文档',
      });
    }
    
    return annotations;
  } catch (error) {
    console.error('Error extracting annotations:', error);
    return [];
  }
}

export function registerPDFHandlers(ipcMain: any, db: any, dialog: any) {
  ipcMain.handle(IPC_CHANNELS.SELECT_PDF_FILES, async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      });
      
      if (result.canceled) {
        return { success: true, data: [] };
      }
      
      const files = result.filePaths.map(filePath => {
        const stats = fs.statSync(filePath);
        return {
          path: filePath,
          size: stats.size,
        };
      });
      
      return { success: true, data: files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_PDF, async (_event: any, filePaths: string[], folderId: string | null) => {
    try {
      const importedDocs: PDFDocument[] = [];
      const importBookmarks: any[] = [];
      const importAnnotations: any[] = [];

      for (const filePath of filePaths) {
        if (!fs.existsSync(filePath) || !filePath.toLowerCase().endsWith('.pdf')) {
          continue;
        }

        const hash = computeFileHash(filePath);
        const existing = db.get('SELECT id FROM pdf_documents WHERE hash = ?', [hash]);
        if (existing) {
          continue;
        }

        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const { totalPages } = await parsePDFFile(filePath);
        const docId = generateId();
        const now = Date.now();

        const pdfDoc: PDFDocument = {
          id: docId,
          filePath,
          fileName,
          fileSize: stats.size,
          totalPages,
          importTime: now,
          lastOpenTime: now,
          folderId: folderId || 'default-folder',
          tags: [],
          currentPage: 1,
          readProgress: 0,
          hash,
        };

        db.run(
          `INSERT INTO pdf_documents 
           (id, file_path, file_name, file_size, total_pages, import_time, last_open_time, 
            folder_id, tags, current_page, read_progress, hash) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pdfDoc.id,
            pdfDoc.filePath,
            pdfDoc.fileName,
            pdfDoc.fileSize,
            pdfDoc.totalPages,
            pdfDoc.importTime,
            pdfDoc.lastOpenTime,
            pdfDoc.folderId,
            JSON.stringify(pdfDoc.tags),
            pdfDoc.currentPage,
            pdfDoc.readProgress,
            pdfDoc.hash,
          ]
        );

        importedDocs.push(pdfDoc);

        const bookmarks = await extractBookmarksFromPDF(filePath);
        for (const bm of bookmarks) {
          db.run(
            `INSERT INTO bookmarks 
             (id, pdf_id, page_number, title, description, color, tags, category, 
              created_at, updated_at, position_data, is_imported) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(),
              docId,
              bm.pageNumber,
              bm.title,
              bm.description,
              bm.color,
              JSON.stringify(bm.tags),
              bm.category,
              now,
              now,
              JSON.stringify(bm.position),
              1,
            ]
          );
        }
        importBookmarks.push(...bookmarks.map(b => ({ ...b, pdfId: docId })));

        const annotations = await extractAnnotationsFromPDF(filePath);
        for (const ann of annotations) {
          db.run(
            `INSERT INTO annotations 
             (id, pdf_id, page_number, type, content, color, rect_data, 
              created_at, updated_at, author) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(),
              docId,
              ann.pageNumber,
              ann.type,
              ann.content,
              ann.color,
              JSON.stringify(ann.rect),
              now,
              now,
              ann.author,
            ]
          );
        }
        importAnnotations.push(...annotations.map(a => ({ ...a, pdfId: docId })));
      }

      return {
        success: true,
        data: {
          documents: importedDocs,
          bookmarks: importBookmarks,
          annotations: importAnnotations,
        },
      };
    } catch (error: any) {
      console.error('Import error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PDF_LIST, (_event: any, folderId: string | null) => {
    try {
      let rows: any[];
      if (folderId) {
        rows = db.all('SELECT * FROM pdf_documents WHERE folder_id = ? ORDER BY import_time DESC', [folderId]);
      } else {
        rows = db.all('SELECT * FROM pdf_documents ORDER BY import_time DESC');
      }

      const docs: PDFDocument[] = rows.map(row => ({
        id: row.id,
        filePath: row.file_path,
        fileName: row.file_name,
        fileSize: row.file_size,
        totalPages: row.total_pages,
        importTime: row.import_time,
        lastOpenTime: row.last_open_time,
        folderId: row.folder_id,
        tags: JSON.parse(row.tags || '[]'),
        currentPage: row.current_page,
        readProgress: row.read_progress,
        hash: row.hash,
      }));

      return { success: true, data: docs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PDF, (_event: any, id: string) => {
    try {
      db.run('DELETE FROM pdf_documents WHERE id = ?', [id]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PDF, (_event: any, id: string, updates: any) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.folderId !== undefined) {
        fields.push('folder_id = ?');
        values.push(updates.folderId);
      }
      if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }
      if (updates.fileName !== undefined) {
        fields.push('file_name = ?');
        values.push(updates.fileName);
      }
      if (updates.lastOpenTime !== undefined) {
        fields.push('last_open_time = ?');
        values.push(updates.lastOpenTime);
      }

      if (fields.length > 0) {
        values.push(id);
        db.run(`UPDATE pdf_documents SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_PDF_CONTENT, (_event: any, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      const buffer = fs.readFileSync(filePath);
      return { success: true, data: Array.from(new Uint8Array(buffer)) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_BOOKMARKS, async (_event: any, filePath: string) => {
    try {
      const bookmarks = await extractBookmarksFromPDF(filePath);
      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_ANNOTATIONS, async (_event: any, filePath: string) => {
    try {
      const annotations = await extractAnnotationsFromPDF(filePath);
      return { success: true, data: annotations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
