/**
 * IndexedDB utilities for offline data storage
 */

const DB_NAME = 'NestTaskOfflineDB';
const DB_VERSION = 2;

export const STORES = {
  TASKS: 'tasks',
  ROUTINES: 'routines',
  COURSES: 'courses',
  TEACHERS: 'teachers',
  ANNOUNCEMENTS: 'announcements',
  PENDING_OPERATIONS: 'pendingOperations'
};

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const objectStore = db.createObjectStore(storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          if (storeName === STORES.TASKS) {
            objectStore.createIndex('userId', 'userId', { unique: false });
            objectStore.createIndex('dueDate', 'dueDate', { unique: false });
            objectStore.createIndex('status', 'status', { unique: false });
          } else if (storeName === STORES.PENDING_OPERATIONS) {
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            objectStore.createIndex('userId', 'userId', { unique: false });
          }
        }
      });
    };
  });
}

/**
 * Save data to IndexedDB
 */
export async function saveToIndexedDB(storeName: string, data: any): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    // Handle both single items and arrays
    if (Array.isArray(data)) {
      // Clear existing data first for bulk operations
      const clearRequest = objectStore.clear();
      
      clearRequest.onsuccess = () => {
        // Add all items
        data.forEach((item) => {
          objectStore.add(item);
        });
      };
    } else {
      // Single item - use put to update or insert
      objectStore.put(data);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`Failed to save to ${storeName}`));
    };
  });
}

/**
 * Get all data from an IndexedDB store
 */
export async function getAllFromIndexedDB(storeName: string): Promise<any[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(new Error(`Failed to get data from ${storeName}`));
    };
  });
}

/**
 * Get a single item from IndexedDB by ID
 */
export async function getFromIndexedDB(storeName: string, id: string): Promise<any> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(new Error(`Failed to get item from ${storeName}`));
    };
  });
}

/**
 * Delete an item from IndexedDB
 */
export async function deleteFromIndexedDB(storeName: string, id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    objectStore.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`Failed to delete from ${storeName}`));
    };
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    objectStore.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`Failed to clear ${storeName}`));
    };
  });
}

/**
 * Query data by index
 */
export async function queryByIndex(
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<any[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    
    try {
      const index = objectStore.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };

      request.onerror = () => {
        db.close();
        reject(new Error(`Failed to query ${storeName} by ${indexName}`));
      };
    } catch (error) {
      db.close();
      reject(new Error(`Index ${indexName} not found in ${storeName}`));
    }
  });
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
