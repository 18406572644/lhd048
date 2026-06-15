import { create } from 'zustand';
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { PDFDocument, Folder, Bookmark, Annotation, Tag, AppSettings } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: any;
  }
}

interface AppState {
  documents: PDFDocument[];
  folders: Folder[];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  tags: Tag[];
  settings: AppSettings | null;
  selectedFolderId: string | null;
  openDocumentIds: string[];
  activeDocumentId: string | null;
  searchKeyword: string;
  isLoading: boolean;

  loadAll: () => Promise<void>;
  loadDocuments: (folderId?: string | null) => Promise<void>;
  loadFolders: () => Promise<void>;
  loadBookmarks: (filters?: any) => Promise<void>;
  loadAnnotations: (filters?: any) => Promise<void>;
  loadTags: () => Promise<void>;
  loadSettings: () => Promise<void>;

  setSelectedFolderId: (id: string | null) => void;
  setSearchKeyword: (keyword: string) => void;
  openDocument: (docId: string) => void;
  closeDocument: (docId: string) => void;
  setActiveDocument: (docId: string | null) => void;

  addDocument: (doc: PDFDocument) => void;
  removeDocument: (docId: string) => void;
  updateDocument: (docId: string, updates: Partial<PDFDocument>) => void;

  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;

  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;

  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;

  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
}

const useAppStore = create<AppState>((set, get) => ({
  documents: [],
  folders: [],
  bookmarks: [],
  annotations: [],
  tags: [],
  settings: null,
  selectedFolderId: null,
  openDocumentIds: [],
  activeDocumentId: null,
  searchKeyword: '',
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().loadFolders(),
      get().loadDocuments(null),
      get().loadBookmarks(),
      get().loadAnnotations(),
      get().loadTags(),
      get().loadSettings(),
    ]);
    set({ isLoading: false });
  },

  loadDocuments: async (folderId: string | null = null) => {
    try {
      const result = await window.electronAPI.pdf.getList(folderId || get().selectedFolderId);
      if (result.success) {
        set({ documents: result.data || [] });
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  },

  loadFolders: async () => {
    try {
      const result = await window.electronAPI.folder.getAll();
      if (result.success) {
        set({ folders: result.data || [] });
      }
    } catch (e) {
      console.error('Failed to load folders:', e);
    }
  },

  loadBookmarks: async (filters?: any) => {
    try {
      const result = await window.electronAPI.bookmark.getAll(filters);
      if (result.success) {
        set({ bookmarks: result.data || [] });
      }
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
    }
  },

  loadAnnotations: async (filters?: any) => {
    try {
      const result = await window.electronAPI.annotation.getAll(filters);
      if (result.success) {
        set({ annotations: result.data || [] });
      }
    } catch (e) {
      console.error('Failed to load annotations:', e);
    }
  },

  loadTags: async () => {
    try {
      const result = await window.electronAPI.tag.getAll();
      if (result.success) {
        set({ tags: result.data || [] });
      }
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  },

  loadSettings: async () => {
    try {
      const result = await window.electronAPI.settings.get();
      if (result.success) {
        set({ settings: result.data });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },

  setSelectedFolderId: (id: string | null) => set({ selectedFolderId: id }),
  setSearchKeyword: (keyword: string) => set({ searchKeyword: keyword }),

  openDocument: (docId: string) => {
    const { openDocumentIds } = get();
    if (!openDocumentIds.includes(docId)) {
      set({ openDocumentIds: [...openDocumentIds, docId] });
    }
    set({ activeDocumentId: docId });
  },

  closeDocument: (docId: string) => {
    const { openDocumentIds, activeDocumentId } = get();
    const newOpenIds = openDocumentIds.filter(id => id !== docId);
    set({ openDocumentIds: newOpenIds });
    if (activeDocumentId === docId) {
      set({ activeDocumentId: newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null });
    }
  },

  setActiveDocument: (docId: string | null) => set({ activeDocumentId: docId }),

  addDocument: (doc: PDFDocument) => set(state => ({
    documents: [doc, ...state.documents],
  })),

  removeDocument: (docId: string) => {
    set(state => ({
      documents: state.documents.filter(d => d.id !== docId),
      openDocumentIds: state.openDocumentIds.filter(id => id !== docId),
      activeDocumentId: state.activeDocumentId === docId ? null : state.activeDocumentId,
    }));
  },

  updateDocument: (docId: string, updates: Partial<PDFDocument>) => set(state => ({
    documents: state.documents.map(d => d.id === docId ? { ...d, ...updates } : d),
  })),

  addBookmark: (bookmark: Bookmark) => set(state => ({
    bookmarks: [bookmark, ...state.bookmarks],
  })),

  removeBookmark: (id: string) => set(state => ({
    bookmarks: state.bookmarks.filter(b => b.id !== id),
  })),

  updateBookmark: (id: string, updates: Partial<Bookmark>) => set(state => ({
    bookmarks: state.bookmarks.map(b => b.id === id ? { ...b, ...updates } : b),
  })),

  addAnnotation: (annotation: Annotation) => set(state => ({
    annotations: [annotation, ...state.annotations],
  })),

  removeAnnotation: (id: string) => set(state => ({
    annotations: state.annotations.filter(a => a.id !== id),
  })),

  updateAnnotation: (id: string, updates: Partial<Annotation>) => set(state => ({
    annotations: state.annotations.map(a => a.id === id ? { ...a, ...updates } : a),
  })),

  addFolder: (folder: Folder) => set(state => ({
    folders: [...state.folders, folder],
  })),

  removeFolder: (id: string) => set(state => ({
    folders: state.folders.filter(f => f.id !== id),
    selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
  })),

  updateFolder: (id: string, updates: Partial<Folder>) => set(state => ({
    folders: state.folders.map(f => f.id === id ? { ...f, ...updates } : f),
  })),

  addTag: (tag: Tag) => set(state => ({
    tags: [...state.tags, tag],
  })),

  removeTag: (id: string) => set(state => ({
    tags: state.tags.filter(t => t.id !== id),
  })),

  updateTag: (id: string, updates: Partial<Tag>) => set(state => ({
    tags: state.tags.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
}));

const StoreContext = createContext<typeof useAppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  return React.createElement(StoreContext.Provider, { value: useAppStore }, children);
}

export function useAppStoreContext() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useAppStoreContext must be used within AppStoreProvider');
  }
  return store();
}

export default useAppStore;
