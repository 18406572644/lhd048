import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { IPC_CHANNELS } from '../../shared/types';

function generateMarkdown(annotations: any[], total: number) {
  const pdfGroups: Record<string, any[]> = {};
  for (const ann of annotations) {
    const key = ann.pdfName || '其他';
    if (!pdfGroups[key]) pdfGroups[key] = [];
    pdfGroups[key].push(ann);
  }

  let md = '# 批注导出文档\n\n';
  md += `> 导出时间: ${new Date().toLocaleString()}\n\n`;
  md += `> 批注总数: ${total}\n\n`;
  md += '---\n\n';

  const typeText: Record<string, string> = {
    highlight: '🖌️ 高亮',
    underline: '📝 下划线',
    strikeout: '❌ 删除线',
    text: '💬 文本注释',
    squiggly: '〰️ 波浪线',
  };

  for (const [pdfName, pdfAnnotations] of Object.entries(pdfGroups)) {
    md += `## 📄 ${pdfName}\n\n`;
    const sortedAnnotations = [...pdfAnnotations].sort((a, b) => a.pageNumber - b.pageNumber);

    for (const ann of sortedAnnotations) {
      md += `### ${typeText[ann.type] || ann.type} - 第 ${ann.pageNumber} 页\n\n`;

      if (ann.content) {
        md += `\`\`\`\n${ann.content}\n\`\`\`\n\n`;
      }

      md += `<span style="color:${ann.color || '#333'}">■</span>`;
      if (ann.author) {
        md += ` *${ann.author}*`;
      }
      md += ` · ${new Date(ann.createdAt).toLocaleString()}`;
      md += '\n\n';
    }
  }

  return md;
}

async function generateWord(annotations: any[]) {
  const pdfGroups: Record<string, any[]> = {};
  for (const ann of annotations) {
    const key = ann.pdfName || '其他';
    if (!pdfGroups[key]) pdfGroups[key] = [];
    pdfGroups[key].push(ann);
  }

  const typeText: Record<string, string> = {
    highlight: '高亮',
    underline: '下划线',
    strikeout: '删除线',
    text: '文本注释',
    squiggly: '波浪线',
  };

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
        text: '批注导出文档',
        bold: true,
        size: 48,
        color: '#1e3a5f',
      }),
    ],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `导出时间: ${new Date().toLocaleString()}`,
          size: 20,
          color: '#666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

  for (const [pdfName, pdfAnnotations] of Object.entries(pdfGroups)) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: pdfName, bold: true, size: 32, color: '#1e3a5f' }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const sortedAnnotations = [...pdfAnnotations].sort((a, b) => a.pageNumber - b.pageNumber);

    for (const ann of sortedAnnotations) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `第 ${ann.pageNumber} 页 - ${typeText[ann.type] || ann.type}`,
              bold: true,
              size: 24,
              color: ann.color || '#333333',
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      if (ann.content) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: ann.content, size: 22 }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (ann.author) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `— ${ann.author} · ${new Date(ann.createdAt).toLocaleString()}`,
                italics: true,
                size: 18,
                color: '#999999',
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

export function registerExportHandlers(ipcMain: any, db: any, dialog: any) {
  ipcMain.handle(IPC_CHANNELS.SAVE_FILE_DIALOG, async (_event: any, options: any = {}) => {
    try {
      const result = await dialog.showSaveDialog({
        title: options.title || '保存文件',
        defaultPath: options.defaultPath || 'export',
        filters: options.filters || [{ name: '所有文件', extensions: ['*'] }],
      });

      if (result.canceled) {
        return { success: true, data: null };
      }

      return { success: true, data: result.filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_WORD, async (_event: any, annotations: any[], filePath: string) => {
    try {
      const enriched: any[] = [];
      for (const ann of annotations) {
        let pdfName = ann.pdfName;
        if (!pdfName && ann.pdfId) {
          const pdf = db.get('SELECT file_name FROM pdf_documents WHERE id = ?', [ann.pdfId]);
          pdfName = pdf?.file_name || '未知文档';
        }
        enriched.push({ ...ann, pdfName });
      }

      const doc = await generateWord(enriched);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_MARKDOWN, (_event: any, annotations: any[], filePath: string) => {
    try {
      const enriched: any[] = [];
      for (const ann of annotations) {
        let pdfName = ann.pdfName;
        if (!pdfName && ann.pdfId) {
          const pdf = db.get('SELECT file_name FROM pdf_documents WHERE id = ?', [ann.pdfId]);
          pdfName = pdf?.file_name || '未知文档';
        }
        enriched.push({ ...ann, pdfName });
      }

      const md = generateMarkdown(enriched, enriched.length);
      fs.writeFileSync(filePath, md, 'utf-8');

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_ANNOTATIONS, async (_event: any, pdfIds: string[], format: string, filePath: string) => {
    try {
      let rows: any[];
      if (pdfIds.length > 0) {
        const placeholders = pdfIds.map(() => '?').join(',');
        rows = db.all(
          `SELECT a.*, p.file_name as pdf_name 
           FROM annotations a 
           LEFT JOIN pdf_documents p ON a.pdf_id = p.id 
           WHERE a.pdf_id IN (${placeholders})
           ORDER BY p.file_name, a.page_number`,
          pdfIds
        );
      } else {
        rows = db.all(
          `SELECT a.*, p.file_name as pdf_name 
           FROM annotations a 
           LEFT JOIN pdf_documents p ON a.pdf_id = p.id 
           ORDER BY p.file_name, a.page_number`
        );
      }

      const annotations = rows.map(row => ({
        id: row.id,
        pdfId: row.pdf_id,
        pdfName: row.pdf_name,
        pageNumber: row.page_number,
        type: row.type,
        content: row.content,
        color: row.color,
        createdAt: row.created_at,
        author: row.author,
      }));

      if (format === 'md') {
        const md = generateMarkdown(annotations, annotations.length);
        fs.writeFileSync(filePath, md, 'utf-8');
        return { success: true };
      } else if (format === 'word' || format === 'docx') {
        const doc = await generateWord(annotations);
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        return { success: true };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
