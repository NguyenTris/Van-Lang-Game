import type { SaveState } from './data';

const DATABASE = 'van-lang-game';
const STORE = 'saves';
const SAVE_KEY = 'autosave';

export class SaveManager {
  private readonly fallbackKey = 'van-lang-autosave-v1';

  async load(): Promise<SaveState | null> {
    try {
      const database = await this.openDatabase();
      const state = await new Promise<SaveState | undefined>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readonly');
        const request = transaction.objectStore(STORE).get(SAVE_KEY);
        request.onsuccess = () => resolve(request.result as SaveState | undefined);
        request.onerror = () => reject(request.error);
      });
      database.close();
      return state?.version === 1 ? state : null;
    } catch {
      const raw = localStorage.getItem(this.fallbackKey);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as SaveState;
        return parsed.version === 1 ? parsed : null;
      } catch {
        return null;
      }
    }
  }

  async save(state: SaveState): Promise<void> {
    localStorage.setItem(this.fallbackKey, JSON.stringify(state));
    try {
      const database = await this.openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).put(state, SAVE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    } catch {
      // localStorage already contains the save, so the game remains resilient.
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.fallbackKey);
    try {
      const database = await this.openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).delete(SAVE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    } catch {
      // Nothing else to clear.
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
