export interface PDFDocument {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  importTime: number;
  lastOpenTime: number;
  folderId: string | null;
  tags: string[];
  currentPage: number;
  readProgress: number;
  hash: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: number;
  order: number;
}

export interface Bookmark {
  id: string;
  pdfId: string;
  pageNumber: number;
  title: string;
  description: string;
  color: string;
  tags: string[];
  category: string;
  createdAt: number;
  updatedAt: number;
  position: {
    top: number;
    left: number;
    zoom: number;
  };
  isImported: boolean;
}

export interface Annotation {
  id: string;
  pdfId: string;
  pageNumber: number;
  type: 'highlight' | 'underline' | 'strikeout' | 'text' | 'squiggly';
  content: string;
  color: string;
  rect: number[];
  createdAt: number;
  updatedAt: number;
  author: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface AppSettings {
  encryptionKey: string;
  theme: 'light' | 'dark';
  defaultColor: string;
  autoSave: boolean;
  openLastDocuments: boolean;
}

export type IPCResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export const IPC_CHANNELS = {
  SELECT_PDF_FILES: 'pdf:select-files',
  IMPORT_PDF: 'pdf:import',
  GET_PDF_LIST: 'pdf:get-list',
  DELETE_PDF: 'pdf:delete',
  UPDATE_PDF: 'pdf:update',
  GET_PDF_CONTENT: 'pdf:get-content',
  EXTRACT_BOOKMARKS: 'pdf:extract-bookmarks',
  EXTRACT_ANNOTATIONS: 'pdf:extract-annotations',

  CREATE_FOLDER: 'folder:create',
  UPDATE_FOLDER: 'folder:update',
  DELETE_FOLDER: 'folder:delete',
  GET_FOLDERS: 'folder:get-all',

  CREATE_BOOKMARK: 'bookmark:create',
  UPDATE_BOOKMARK: 'bookmark:update',
  DELETE_BOOKMARK: 'bookmark:delete',
  GET_BOOKMARKS: 'bookmark:get-all',
  GET_BOOKMARKS_BY_PDF: 'bookmark:get-by-pdf',
  SEARCH_BOOKMARKS: 'bookmark:search',
  EXPORT_BOOKMARKS: 'bookmark:export',
  IMPORT_BOOKMARKS: 'bookmark:import',

  CREATE_ANNOTATION: 'annotation:create',
  UPDATE_ANNOTATION: 'annotation:update',
  DELETE_ANNOTATION: 'annotation:delete',
  GET_ANNOTATIONS: 'annotation:get-all',
  GET_ANNOTATIONS_BY_PDF: 'annotation:get-by-pdf',
  EXPORT_ANNOTATIONS: 'annotation:export',

  CREATE_TAG: 'tag:create',
  UPDATE_TAG: 'tag:update',
  DELETE_TAG: 'tag:delete',
  GET_TAGS: 'tag:get-all',

  SAVE_READ_PROGRESS: 'progress:save',
  GET_READ_PROGRESS: 'progress:get',

  EXPORT_WORD: 'export:word',
  EXPORT_MARKDOWN: 'export:markdown',
  SAVE_FILE_DIALOG: 'dialog:save-file',

  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
} as const;
