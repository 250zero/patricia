import { Injectable } from '@angular/core';
import type { Receipt } from '../models/receipt.model';

const DB_NAME = 'patricia_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'cached_receipts';

@Injectable({
  providedIn: 'root',
})
export class OfflineCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB no soportado en este entorno.'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async saveReceipts(receipts: Receipt[]): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();
      for (const r of receipts) {
        store.put(r);
      }
    } catch (err) {
      console.warn('No se pudo guardar comprobantes en IndexedDB:', err);
    }
  }

  async getReceipts(): Promise<Receipt[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      // Ignorar
    }
  }
}
