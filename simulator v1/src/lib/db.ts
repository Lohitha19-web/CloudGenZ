export const STORE_USERS = 'users';
export const STORE_DOCS = 'documents';

let db: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const req = indexedDB.open('CloudGenzDocs', 1);
    
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const targetDb = (e.target as IDBOpenDBRequest).result;
      if (!targetDb.objectStoreNames.contains(STORE_USERS)) {
        const us = targetDb.createObjectStore(STORE_USERS, { keyPath: 'email' });
        us.createIndex('email', 'email', { unique: true });
      }
      if (!targetDb.objectStoreNames.contains(STORE_DOCS)) {
        const ds = targetDb.createObjectStore(STORE_DOCS, { keyPath: 'id', autoIncrement: true });
        ds.createIndex('owner', 'owner', { unique: false });
        ds.createIndex('name', 'name', { unique: false });
      }
    };
    
    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    req.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

export function dbAdd(storeName: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbGet(storeName: string, key: string | number): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbGetByIndex(storeName: string, indexName: string, value: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(storeName, 'readonly');
    const idx = tx.objectStore(storeName).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbDelete(storeName: string, key: string | number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
