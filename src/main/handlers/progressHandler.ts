import { IPC_CHANNELS } from '../../shared/types';

export function registerProgressHandlers(ipcMain: any, db: any) {
  ipcMain.handle(IPC_CHANNELS.SAVE_READ_PROGRESS, (_event: any, pdfId: string, page: number, progress: number) => {
    try {
      const now = Date.now();
      db.run(
        'UPDATE pdf_documents SET current_page = ?, read_progress = ?, last_open_time = ? WHERE id = ?',
        [page, progress, now, pdfId]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_READ_PROGRESS, (_event: any, pdfId: string) => {
    try {
      const row = db.get(
        'SELECT current_page, read_progress, last_open_time FROM pdf_documents WHERE id = ?',
        [pdfId]
      );
      
      if (!row) {
        return { success: true, data: { currentPage: 1, progress: 0, lastOpenTime: null } };
      }

      return {
        success: true,
        data: {
          currentPage: row.current_page || 1,
          progress: row.read_progress || 0,
          lastOpenTime: row.last_open_time,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
