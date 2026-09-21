import type { Book } from '../types/reader';

const DB_NAME = 'AIEbookReaderDB';
const DB_VERSION = 1;
const STORE_BOOKS = 'books';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBookToDb(book: Book): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    const store = tx.objectStore(STORE_BOOKS);

    // 仅存储书籍元数据、书签、笔记、高亮与本地文件路径，不存储臃肿易损的二进制内容
    const clone = {
      id: book.id,
      title: book.title,
      author: book.author,
      ext: book.ext,
      kind: book.kind,
      size: book.size,
      cover: book.cover || null,
      toc: book.toc || [],
      annotations: book.annotations || [],
      marks: book.marks || [],
      vocabs: book.vocabs || [],
      progress: book.progress || 0,
      locationLabel: book.locationLabel || '',
      addedAt: book.addedAt || Date.now(),
      lastReadAt: book.lastReadAt || Date.now(),
      pageCount: book.pageCount,
      chapterCount: book.chapterCount,
      readPage: book.readPage,
      readIndex: book.readIndex,
      rawText: book.rawText,
      textMarkdown: book.textMarkdown,
      textModeActive: book.textModeActive,
      bilingualActive: book.bilingualActive,
      bilingualParas: book.bilingualParas,
      localPath: book.localPath || ''
    };

    store.put(clone);
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('存储书籍到 IndexedDB 失败:', err);
  }
}

export async function loadAllBooksFromDb(): Promise<Book[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_BOOKS, 'readonly');
    const store = tx.objectStore(STORE_BOOKS);
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const rawList = req.result || [];
        const books: Book[] = rawList.map((item: any) => {
          // 剥离历史旧数据中的 fileData，纯净加载元数据
          const { fileData: _oldBuf, ...clean } = item;
          return clean as Book;
        });
        resolve(books);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('从 IndexedDB 读取书籍失败:', err);
    return [];
  }
}

export async function deleteBookFromDb(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    tx.objectStore(STORE_BOOKS).delete(id);
  } catch (err) {
    console.warn('从 IndexedDB 删除书籍失败:', err);
  }
}
