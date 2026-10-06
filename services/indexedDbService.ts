import { GalleryItem, Collection, PromptHistoryItem } from '../types';

const DB_NAME = 'NKI_Studio_DB';
const DB_VERSION = 2;
const STORE_GALLERY = 'gallery_items';
const STORE_COLLECTIONS = 'collections';
const STORE_KEYVAL = 'keyval_store';
const STORE_PROMPTS = 'prompt_history';

export interface AppStorageSettings {
  driveFolderName: string;
  localFolderName?: string;
  hasLocalDirectory: boolean;
  namingPattern: 'timestamp' | 'subject_timestamp' | 'seed_prompt';
  customPrefix: string;
  autoSaveToGallery: boolean;
  autoSyncToDrive: boolean;
  autoSaveToLocalDisk: boolean;
}

export const DEFAULT_STORAGE_SETTINGS: AppStorageSettings = {
  driveFolderName: 'NK Imagen Storage',
  localFolderName: undefined,
  hasLocalDirectory: false,
  namingPattern: 'subject_timestamp',
  customPrefix: 'NKI_',
  autoSaveToGallery: true,
  autoSyncToDrive: false,
  autoSaveToLocalDisk: false,
};

// Open and initialize IndexedDB
let dbPromise: Promise<IDBDatabase> | null = null;

export const openGalleryDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Gallery Items Store
      if (!db.objectStoreNames.contains(STORE_GALLERY)) {
        const galleryStore = db.createObjectStore(STORE_GALLERY, { keyPath: 'id' });
        galleryStore.createIndex('createdAt', 'createdAt', { unique: false });
        galleryStore.createIndex('collectionId', 'collectionId', { unique: false });
        galleryStore.createIndex('type', 'type', { unique: false });
      }

      // 2. Collections Store
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        const colStore = db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
        colStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 3. Key-Value Store for Settings and Directory Handles
      if (!db.objectStoreNames.contains(STORE_KEYVAL)) {
        db.createObjectStore(STORE_KEYVAL, { keyPath: 'key' });
      }

      // 4. Prompt History Store (Dedicated store for permanent prompt storage)
      if (!db.objectStoreNames.contains(STORE_PROMPTS)) {
        const promptStore = db.createObjectStore(STORE_PROMPTS, { keyPath: 'id' });
        promptStore.createIndex('timestamp', 'timestamp', { unique: false });
        promptStore.createIndex('source', 'source', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
};

// Generic Transaction Helper
const getTransaction = async (
  storeName: string,
  mode: IDBTransactionMode
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> => {
  const db = await openGalleryDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { store, tx };
};

// ==========================================
// GALLERY PERSISTENCE (PERMANENT STORAGE)
// ==========================================

export const getAllGalleryItemsDB = async (): Promise<GalleryItem[]> => {
  try {
    const { store } = await getTransaction(STORE_GALLERY, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items: GalleryItem[] = request.result || [];
        // Sort newest first by default
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to load gallery items:', err);
    return [];
  }
};

export const saveGalleryItemDB = async (item: GalleryItem): Promise<void> => {
  try {
    const { store, tx } = await getTransaction(STORE_GALLERY, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to save gallery item:', item.id, err);
  }
};

export const saveAllGalleryItemsDB = async (items: GalleryItem[]): Promise<void> => {
  if (!items || items.length === 0) return;
  try {
    const { store, tx } = await getTransaction(STORE_GALLERY, 'readwrite');
    for (const item of items) {
      store.put(item);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to bulk save gallery items:', err);
  }
};

export const deleteGalleryItemDB = async (id: string): Promise<void> => {
  try {
    const { store, tx } = await getTransaction(STORE_GALLERY, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to delete gallery item:', id, err);
  }
};

export const clearGalleryDB = async (): Promise<void> => {
  try {
    const { store, tx } = await getTransaction(STORE_GALLERY, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to clear gallery:', err);
  }
};

export const getGalleryStorageEstimate = async (): Promise<{
  count: number;
  totalBytesApprox: number;
  formattedSize: string;
}> => {
  try {
    const items = await getAllGalleryItemsDB();
    let totalBytes = 0;
    for (const item of items) {
      if (item.src) {
        totalBytes += item.src.length; // Approximate bytes of base64
      }
    }
    const mb = totalBytes / (1024 * 1024);
    const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
    return {
      count: items.length,
      totalBytesApprox: totalBytes,
      formattedSize: formatted,
    };
  } catch (e) {
    return { count: 0, totalBytesApprox: 0, formattedSize: '0 MB' };
  }
};

// ==========================================
// COLLECTIONS PERSISTENCE
// ==========================================

export const getAllCollectionsDB = async (): Promise<Collection[]> => {
  try {
    const { store } = await getTransaction(STORE_COLLECTIONS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to load collections:', err);
    return [];
  }
};

export const saveCollectionDB = async (collection: Collection): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_COLLECTIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(collection);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to save collection:', collection.id, err);
  }
};

export const saveAllCollectionsDB = async (collections: Collection[]): Promise<void> => {
  try {
    const { store, tx } = await getTransaction(STORE_COLLECTIONS, 'readwrite');
    for (const c of collections) {
      store.put(c);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to save collections:', err);
  }
};

export const deleteCollectionDB = async (id: string): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_COLLECTIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to delete collection:', id, err);
  }
};

// ==========================================
// SETTINGS PERSISTENCE & LOCAL DIRECTORY HANDLE
// ==========================================

export const getStorageSettingsDB = async (): Promise<AppStorageSettings> => {
  try {
    const { store } = await getTransaction(STORE_KEYVAL, 'readonly');
    return new Promise((resolve) => {
      const req = store.get('storage_settings');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_STORAGE_SETTINGS, ...req.result.value });
        } else {
          resolve(DEFAULT_STORAGE_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_STORAGE_SETTINGS);
    });
  } catch (e) {
    return DEFAULT_STORAGE_SETTINGS;
  }
};

export const saveStorageSettingsDB = async (
  partial: Partial<AppStorageSettings>
): Promise<AppStorageSettings> => {
  try {
    const current = await getStorageSettingsDB();
    const updated = { ...current, ...partial };
    const { store } = await getTransaction(STORE_KEYVAL, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ key: 'storage_settings', value: updated });
      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('[IndexedDB] Failed to save storage settings:', e);
    return { ...DEFAULT_STORAGE_SETTINGS, ...partial };
  }
};

// Store FileSystemDirectoryHandle directly in IndexedDB (Chrome/Edge File System Access API)
export const saveLocalDirectoryHandle = async (
  handle: any,
  folderName: string
): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_KEYVAL, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key: 'local_dir_handle', value: handle });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    await saveStorageSettingsDB({
      localFolderName: folderName,
      hasLocalDirectory: true,
    });
  } catch (e) {
    console.error('[IndexedDB] Failed to save directory handle:', e);
  }
};

export const getLocalDirectoryHandle = async (): Promise<any | null> => {
  try {
    const { store } = await getTransaction(STORE_KEYVAL, 'readonly');
    return new Promise((resolve) => {
      const req = store.get('local_dir_handle');
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const clearLocalDirectoryHandle = async (): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_KEYVAL, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete('local_dir_handle');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    await saveStorageSettingsDB({
      localFolderName: undefined,
      hasLocalDirectory: false,
      autoSaveToLocalDisk: false,
    });
  } catch (e) {
    console.error('[IndexedDB] Failed to clear directory handle:', e);
  }
};

/**
 * Directly writes an image blob into the user's selected local folder on their PC.
 */
export const writeBlobToLocalDirectory = async (
  dirHandle: any,
  filename: string,
  blob: Blob
): Promise<boolean> => {
  if (!dirHandle) return false;
  try {
    // Check permission
    if (dirHandle.queryPermission) {
      const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const req = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') {
          console.warn('[FileSystem] Permission to write to local directory was denied.');
          return false;
        }
      }
    }

    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.error('[FileSystem] Error writing to local directory:', err);
    return false;
  }
};

// ==========================================
// SEAMLESS MIGRATION FROM LOCALSTORAGE
// ==========================================

export const migrateFromLocalStorage = async (): Promise<{
  migratedCount: number;
}> => {
  if (typeof window === 'undefined') return { migratedCount: 0 };

  try {
    // 1. Check if localStorage has legacy gallery items
    const rawGallery = window.localStorage ? window.localStorage.getItem('hlc_gallery_items_with_sync') : null;
    let legacyItems: GalleryItem[] = [];
    if (rawGallery) {
      try {
        const parsed = JSON.parse(rawGallery);
        if (Array.isArray(parsed) && parsed.length > 0) {
          legacyItems = parsed;
        }
      } catch (e) {
        // invalid json
      }
    }

    // 2. Check if IndexedDB already has items
    const existingDBItems = await getAllGalleryItemsDB();

    let count = 0;
    if (legacyItems.length > 0) {
      // Merge items that are in localStorage but not in DB
      const existingIds = new Set(existingDBItems.map((i) => i.id));
      const toInsert = legacyItems.filter((i) => !existingIds.has(i.id));

      if (toInsert.length > 0) {
        await saveAllGalleryItemsDB(toInsert);
        count = toInsert.length;
        console.log(`[IndexedDB] Successfully migrated ${count} legacy images from localStorage into IndexedDB!`);
      }

      // Safe clean up or trim of localStorage to prevent QuotaExceededError
      try {
        // Keep only IDs or remove the huge base64 strings from localStorage
        window.localStorage.removeItem('hlc_gallery_items_with_sync');
      } catch (e) {
        // ignore
      }
    }

    // 3. Migrate collections if needed
    const rawCollections = window.localStorage ? window.localStorage.getItem('hlc_collections_with_sync') : null;
    if (rawCollections) {
      try {
        const parsedCols = JSON.parse(rawCollections);
        if (Array.isArray(parsedCols) && parsedCols.length > 0) {
          const existingCols = await getAllCollectionsDB();
          if (existingCols.length === 0) {
            await saveAllCollectionsDB(parsedCols);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return { migratedCount: count };
  } catch (err) {
    console.error('[IndexedDB] Migration error:', err);
    return { migratedCount: 0 };
  }
};

// ==========================================
// PROMPT HISTORY PERSISTENCE (PERMANENT STORAGE)
// ==========================================

export const savePromptItemDB = async (item: PromptHistoryItem): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_PROMPTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to save prompt item:', err);
  }
};

export const getAllPromptItemsDB = async (): Promise<PromptHistoryItem[]> => {
  try {
    const { store } = await getTransaction(STORE_PROMPTS, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // Sort descending by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to fetch prompt items:', err);
    return [];
  }
};

export const deletePromptItemDB = async (id: string): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_PROMPTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to delete prompt item:', err);
  }
};

export const clearAllPromptItemsDB = async (): Promise<void> => {
  try {
    const { store } = await getTransaction(STORE_PROMPTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to clear prompt store:', err);
  }
};

export const saveAllPromptItemsDB = async (items: PromptHistoryItem[]): Promise<void> => {
  try {
    const { store, tx } = await getTransaction(STORE_PROMPTS, 'readwrite');
    for (const item of items) {
      store.put(item);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Failed to save all prompt items:', err);
  }
};
