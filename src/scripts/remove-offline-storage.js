/**
 * Script to migrate data from IndexedDB offline storage to memory cache
 * Run this script before completely removing offline storage to ensure no data loss
 */

// List of store names to check in IndexedDB
const STORES = [
  'tasks',
  'routines',
  'userData',
  'courses',
  'materials',
  'teachers',
  'pendingTaskOperations',
  'pendingRoutineOperations',
  'pendingCourseOperations',
  'pendingTeacherOperations'
];

// DB Name
const DB_NAME = 'nesttask_offline_db';

/**
 * Check if we have data in IndexedDB that needs migration
 */
async function checkForDataToMigrate() {
  console.log('Checking for data in IndexedDB that needs migration...');
  
  try {
    // Check if IndexedDB is available
    if (!indexedDB) {
      console.log('IndexedDB not supported in this browser');
      return false;
    }
    
    // Try to open the database
    const openRequest = indexedDB.open(DB_NAME);
    
    return new Promise((resolve) => {
      openRequest.onerror = () => {
        console.log('Error opening IndexedDB, no migration needed');
        resolve(false);
      };
      
      openRequest.onsuccess = (event) => {
        const db = event.target.result;
        const storeNames = Array.from(db.objectStoreNames);
        
        // Check if we have any of the stores
        const hasStores = STORES.some(store => storeNames.includes(store));
        
        console.log('IndexedDB stores found:', storeNames);
        
        if (hasStores) {
          console.log('Data found in IndexedDB that may need migration');
          // Here we would migrate the data to memory cache
          migrateData(db, storeNames);
          resolve(true);
        } else {
          console.log('No relevant data found in IndexedDB');
          resolve(false);
        }
        
        db.close();
      };
    });
  } catch (error) {
    console.error('Error checking for data to migrate:', error);
    return false;
  }
}

/**
 * Migrate data from IndexedDB to memory cache
 */
async function migrateData(db, storeNames) {
  console.log('Starting data migration from IndexedDB to memory cache...');
  
  try {
    // For each store, get all data and store in memory
    for (const store of storeNames) {
      try {
        const transaction = db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();
        
        request.onsuccess = () => {
          const data = request.result;
          if (data && data.length > 0) {
            console.log(`Migrated ${data.length} items from ${store}`);
            
            // Store data in localStorage temporarily
            try {
              localStorage.setItem(`migrate_${store}`, JSON.stringify(data));
            } catch (error) {
              console.error(`Failed to store ${store} data in localStorage:`, error);
            }
          }
        };
        
        request.onerror = () => {
          console.error(`Error getting data from ${store}`);
        };
      } catch (error) {
        console.error(`Error migrating ${store}:`, error);
      }
    }
    
    console.log('Migration complete');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

/**
 * Clear all IndexedDB data after migration
 */
async function clearIndexedDB() {
  console.log('Clearing IndexedDB data...');
  
  try {
    // Delete the entire database
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log('IndexedDB database successfully deleted');
    };
    
    deleteRequest.onerror = () => {
      console.error('Error deleting IndexedDB database');
    };
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}

// Execute the migration check when the script is loaded
window.addEventListener('load', async () => {
  console.log('Checking for offline data to migrate...');
  const needsMigration = await checkForDataToMigrate();
  
  if (needsMigration) {
    // Ask for confirmation before clearing
    const shouldClear = confirm(
      'Data from offline storage has been migrated to memory cache. ' +
      'Would you like to clear the old offline storage data?'
    );
    
    if (shouldClear) {
      await clearIndexedDB();
      alert('Offline storage data has been cleared');
    } else {
      alert('Offline storage data has been kept. You can clear it later.');
    }
  }
}); 