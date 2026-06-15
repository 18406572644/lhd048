import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },

  pdf: {
    selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_PDF_FILES),
    import: (filePaths: string[], folderId: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PDF, filePaths, folderId),
    getList: (folderId: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_PDF_LIST, folderId),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_PDF, id),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PDF, id, updates),
    getContent: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_PDF_CONTENT, filePath),
    extractBookmarks: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_BOOKMARKS, filePath),
    extractAnnotations: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_ANNOTATIONS, filePath),
  },

  folder: {
    create: (folder: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_FOLDER, folder),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_FOLDER, id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_FOLDER, id),
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_FOLDERS),
  },

  bookmark: {
    create: (bookmark: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_BOOKMARK, bookmark),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_BOOKMARK, id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_BOOKMARK, id),
    getAll: (filters?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_BOOKMARKS, filters),
    getByPdf: (pdfId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_BOOKMARKS_BY_PDF, pdfId),
    search: (query: string, filters?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SEARCH_BOOKMARKS, query, filters),
    export: (bookmarkIds: string[], format: string, filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_BOOKMARKS, bookmarkIds, format, filePath),
    import: (filePath: string, folderId: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_BOOKMARKS, filePath, folderId),
  },

  annotation: {
    create: (annotation: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_ANNOTATION, annotation),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ANNOTATION, id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_ANNOTATION, id),
    getAll: (filters?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_ANNOTATIONS, filters),
    getByPdf: (pdfId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_ANNOTATIONS_BY_PDF, pdfId),
    export: (pdfIds: string[], format: string, filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_ANNOTATIONS, pdfIds, format, filePath),
  },

  tag: {
    create: (tag: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.CREATE_TAG, tag),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TAG, id, updates),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DELETE_TAG, id),
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_TAGS),
  },

  progress: {
    save: (pdfId: string, page: number, progress: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_READ_PROGRESS, pdfId, page, progress),
    get: (pdfId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.GET_READ_PROGRESS, pdfId),
  },

  export: {
    toWord: (annotations: any[], filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_WORD, annotations, filePath),
    toMarkdown: (annotations: any[], filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_MARKDOWN, annotations, filePath),
    saveDialog: (options: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE_DIALOG, options),
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
    update: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
