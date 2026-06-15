import DatabaseConstructor from 'better-sqlite3';
import * as CryptoJS from 'crypto-js';
import { randomBytes } from 'crypto';

const SECRET_KEY = 'pdf-cabinet-secure-key-2024';

export class Database {
  private db: any;

  constructor(dbPath: string) {
    this.db = new DatabaseConstructor(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  }

  private decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private encryptObj(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }

  private decryptObj(ciphertext: string): any {
    const decrypted = this.decrypt(ciphertext);
    return JSON.parse(decrypted);
  }

  public init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        color TEXT,
        icon TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pdf_documents (
        id TEXT PRIMARY KEY,
        fileHash TEXT NOT NULL UNIQUE,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        folderId TEXT REFERENCES folders(id),
        totalPages INTEGER NOT NULL,
        fileSize INTEGER NOT NULL,
        currentPage INTEGER DEFAULT 1,
        readProgress REAL DEFAULT 0,
        tags TEXT DEFAULT '[]',
        starred INTEGER DEFAULT 0,
        importedAt INTEGER NOT NULL,
        lastOpenedAt INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        pdfId TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        pageNumber INTEGER NOT NULL,
        color TEXT,
        tags TEXT DEFAULT '[]',
        folderId TEXT REFERENCES folders(id),
        xPosition REAL,
        yPosition REAL,
        isStarred INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        pdfId TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        content TEXT,
        color TEXT,
        pageNumber INTEGER NOT NULL,
        rects TEXT,
        comment TEXT,
        author TEXT,
        subject TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_bookmarks_pdf ON bookmarks(pdfId);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_page ON bookmarks(pageNumber);
      CREATE INDEX IF NOT EXISTS idx_annotations_pdf ON annotations(pdfId);
      CREATE INDEX IF NOT EXISTS idx_annotations_page ON annotations(pageNumber);
      CREATE INDEX IF NOT EXISTS idx_docs_folder ON pdf_documents(folderId);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folderId);
    `);

    const folderExists = this.db.prepare('SELECT id FROM folders WHERE id = ?').get('default-folder');
    if (!folderExists) {
      const now = Date.now();
      this.db.prepare('INSERT INTO folders (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
        .run('default-folder', '默认文件柜', '#1e3a5f', now, now);
    }

    const defaultSettings = [
      { key: 'encryption_enabled', value: 'true' },
      { key: 'theme', value: 'light' },
      { key: 'default_zoom', value: '1.0' },
      { key: 'auto_save_interval', value: '30' },
      { key: 'reader_view_mode', value: 'single' }
    ];

    const settingStmt = this.db.prepare('INSERT OR IGNORE INTO settings (key, value, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
    const now = Date.now();
    const tx = this.db.transaction((settings: any[]) => {
      for (const s of settings) {
        settingStmt.run(s.key, s.value, now, now);
      }
    });
    tx(defaultSettings);
  }

  public getDb(): any {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}
