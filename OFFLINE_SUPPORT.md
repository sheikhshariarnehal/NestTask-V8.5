# NestTask Offline Support

## Overview

NestTask now includes comprehensive offline support for the Capacitor Android app, allowing users to continue using the app without an active internet connection. Data is automatically cached and synchronized when the connection is restored.

## Features Implemented

### 1. **Network Status Detection**
- ✅ Uses Capacitor's Network plugin for native Android platform
- ✅ Falls back to browser APIs for web platform
- ✅ Real-time network status monitoring
- ✅ Automatic detection of connection changes

### 2. **Visual Indicators**

#### Offline Toast Notification
- Shows a temporary notification when going offline/online
- Red indicator: "You're offline"
- Green indicator: "Back online" (auto-dismisses after 3 seconds)
- Located at the top center of the screen

#### Offline Banner
- Persistent amber banner at the top when offline
- Message: "You're offline. Changes will sync when connection is restored."
- Disappears automatically when connection is restored

#### Navigation Bar Indicator
- Small red badge in the navigation bar showing "Offline" status
- Displays next to the NestTask logo
- Visible only when offline

### 3. **Offline Data Storage**

#### IndexedDB Implementation
All data is stored locally in IndexedDB with the following stores:
- **tasks**: User tasks with indexing on userId, dueDate, and status
- **routines**: Class routines and schedules
- **courses**: Course information
- **teachers**: Teacher data
- **announcements**: Announcements and notifications
- **pendingOperations**: Queued operations to sync when online

#### Automatic Data Caching
- Data is automatically cached when fetched online
- Cached data is served when offline
- Transparent switching between online and offline modes

### 4. **Offline Operations**

#### Supported Operations
Users can perform the following operations offline:
- Create new tasks
- Update existing tasks
- Delete tasks
- View all cached data

#### Operation Queuing
- All offline operations are queued in IndexedDB
- Operations are stored with timestamps and user IDs
- Queued operations sync automatically when connection is restored

#### Auto-Sync on Reconnection
- Detects when internet connection is restored
- Automatically syncs all pending operations
- Operations are processed in chronological order
- Failed operations are retried

### 5. **Background Sync (Where Supported)**
- Registers for background sync when operations are queued
- Syncs data even if the app is closed (on supported devices)
- Falls back to manual sync if background sync is unavailable

## How It Works

### For Users

1. **Normal Online Usage**
   - App works normally with live data from the server
   - All changes are immediately saved to the server
   - Data is cached in the background

2. **Going Offline**
   - Toast notification appears: "You're offline"
   - Offline banner appears at the top
   - Small "Offline" badge appears in navigation
   - App continues to work with cached data

3. **Working Offline**
   - View all previously loaded data
   - Create, update, and delete tasks
   - Changes are queued for synchronization
   - Full app functionality maintained

4. **Coming Back Online**
   - Toast notification appears: "Back online"
   - Offline indicators disappear
   - All queued changes sync automatically
   - Data refreshes from server

### For Developers

#### Network Status Hook
```typescript
import { useOfflineStatus } from './hooks/useOfflineStatus';

function MyComponent() {
  const isOffline = useOfflineStatus();
  
  return <div>{isOffline ? 'Offline' : 'Online'}</div>;
}
```

#### Offline Data Hook
```typescript
import { useOfflineData } from './hooks/useOfflineData';

function MyComponent() {
  const { data, loading, error, isOffline } = useOfflineData(
    'tasks',
    onlineData,
    fetchFunction
  );
  
  // Use data - automatically switches between online/offline
}
```

#### Offline Operations Hook
```typescript
import { useOfflineOperations } from './hooks/useOfflineOperations';

function MyComponent() {
  const { saveOperation, syncOperations, hasPendingOperations } = 
    useOfflineOperations({ entityType: 'task', userId });
  
  // Queue operations when offline
  await saveOperation({
    type: 'create',
    endpoint: '/api/tasks',
    payload: taskData
  });
  
  // Manually trigger sync
  await syncOperations();
}
```

## Technical Details

### Capacitor Plugins Used

1. **@capacitor/network** (v8.0.0)
   - Network status monitoring
   - Connection type detection
   - Network change events

2. **@capacitor/status-bar** (v8.0.0)
   - Status bar styling
   - Consistent UI across platforms

### Configuration

#### capacitor.config.ts
```typescript
plugins: {
  StatusBar: {
    style: 'dark',
    backgroundColor: '#1e293b',
    overlaysWebView: false
  },
  Network: {
    // Network monitoring is enabled by default
  }
}
```

### Data Flow

```
Online Mode:
API → App → IndexedDB (cache)

Offline Mode:
IndexedDB → App

Operations Offline:
User Action → Queue (IndexedDB) → Sync on Reconnect → API
```

## Testing Offline Features

### On Android Device/Emulator

1. **Using Airplane Mode**
   - Open the app
   - Enable Airplane Mode
   - Observe offline indicators
   - Try creating/updating tasks
   - Disable Airplane Mode
   - Verify auto-sync

2. **Using Network Settings**
   - Disable WiFi and Mobile Data
   - Test offline functionality
   - Re-enable network
   - Verify synchronization

### On Web Browser (Testing)

1. **Using DevTools**
   - Open Chrome DevTools
   - Go to Network tab
   - Check "Offline" checkbox
   - Test offline features
   - Uncheck to go back online

2. **Using Service Worker**
   - Open Application tab in DevTools
   - Go to Service Workers
   - Check "Offline" checkbox

## Limitations

1. **Authentication Required Online**
   - Initial login requires internet connection
   - Token refresh requires internet connection

2. **File Uploads**
   - File uploads (images, documents) require internet
   - Queued for later when offline

3. **Real-time Updates**
   - Real-time updates from other users not available offline
   - Data syncs on reconnection

4. **Storage Limits**
   - IndexedDB has storage limits (varies by device)
   - Typically 50MB-100MB available
   - User may need to clear data if limit reached

## Troubleshooting

### Offline Indicator Stuck
1. Force close and reopen the app
2. Check actual network connectivity
3. Clear app cache and data

### Data Not Syncing
1. Check internet connection
2. Verify you're logged in
3. Check console for sync errors
4. Try manual refresh

### Cached Data Out of Date
1. Pull to refresh on the home screen
2. Force sync by going offline and back online
3. Clear app data (will lose offline data)

## Future Enhancements

- [ ] Conflict resolution for concurrent edits
- [ ] Partial sync (only changed data)
- [ ] Configurable storage limits
- [ ] Offline analytics
- [ ] Better error handling and retry logic
- [ ] Compression for cached data
- [ ] Selective sync (user preferences)

## Build Commands

```bash
# Build for Android with offline support
npm run android:build

# Open in Android Studio
npm run android:open

# Full build and open
npm run android:run

# Sync Capacitor
npm run android:sync
```

## Support

For issues or questions about offline functionality:
1. Check this README
2. Check console logs for errors
3. Verify network permissions in AndroidManifest.xml
4. Test on different network conditions

---

**Version**: 1.0.0  
**Last Updated**: December 29, 2025  
**Plugins**: @capacitor/network@8.0.0, @capacitor/status-bar@8.0.0
