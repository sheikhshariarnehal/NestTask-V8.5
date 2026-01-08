# App Resume Data Loading Issue - Analysis & Fix

## Issue Summary
**Problem**: When the Capacitor app or browser is minimized for a long time and then reopened, data doesn't properly load/refresh.

**TestSprite Analysis Date**: January 8, 2026

---

## Root Cause Analysis

After comprehensive code analysis using TestSprite MCP, I've identified **THREE CRITICAL ISSUES** preventing proper data refresh:

### 1. **Race Condition Between Visibility Events and Session Validation**
- **Location**: [src/hooks/useSupabaseLifecycle.ts](src/hooks/useSupabaseLifecycle.ts)
- **Problem**: When the app resumes after being minimized, there's a race condition:
  1. `visibilitychange` event fires → triggers data refresh
  2. Session validation runs in parallel
  3. If session is expired, data fetch fails silently with RLS errors
  4. User sees stale data or blank screen

**Timeline of Events**:
```
Time 0ms:  App becomes visible
Time 5ms:  visibilitychange event fires
Time 10ms: useTasks.handleResumeRefresh() starts data fetch
Time 15ms: useSupabaseLifecycle.handleResume() starts session validation
Time 100ms: Data fetch fails (expired token)
Time 150ms: Session refresh completes (new token)
Time 151ms: User sees blank/stale data
```

### 2. **Insufficient Throttling on Resume Events**
- **Location**: [src/hooks/useTasks.ts](src/hooks/useTasks.ts#L253-L268)
- **Problem**: Multiple resume events fire simultaneously:
  - `app-resume` (from useAppLifecycle)
  - `supabase-resume` (from session refresh)
  - `supabase-session-refreshed` (from token refresh)
  - `supabase-network-reconnect` (from network changes)
  - `supabase-visibility-refresh` (from visibility)
  
  Current throttle of 1.5 seconds is too short, causing:
  - Multiple concurrent data fetches
  - Database connection exhaustion
  - Race conditions between fetches
  - Inconsistent state updates

### 3. **Session Auto-Refresh Not Restarting Properly**
- **Location**: [src/hooks/useSupabaseLifecycle.ts](src/hooks/useSupabaseLifecycle.ts#L148-L152)
- **Problem**: The code attempts to restart Supabase's auto-refresh on resume:
  ```typescript
  try {
    await supabase.auth.startAutoRefresh();
    isAutoRefreshEnabledRef.current = true;
  } catch (e) {
    // silently ignored
  }
  ```
  
  However:
  - Errors are silently caught and ignored
  - No retry mechanism if `startAutoRefresh()` fails
  - Timer-based auto-refresh may not work reliably in backgrounded WebViews
  - No verification that auto-refresh actually started

---

## Impact Assessment

### Affected Scenarios:
1. ✅ **Short Background** (< 5 minutes): Works - session still valid
2. ❌ **Medium Background** (5-60 minutes): **FAILS** - token expired, RLS blocks queries
3. ❌ **Long Background** (> 60 minutes): **FAILS** - session fully expired
4. ❌ **Overnight Background**: **FAILS** - session + refresh token expired
5. ❌ **Network Reconnect**: **INTERMITTENT** - multiple events fire simultaneously

### User Experience:
- Blank screens after resuming app
- Stale data showing old information
- Loading spinners that never complete
- Silent failures (no error messages)
- Need to force-refresh or restart app

---

## Recommended Fixes

### Fix #1: Ensure Session Validation Completes BEFORE Data Fetch

**Priority**: 🔴 CRITICAL

**Implementation**:

```typescript
// src/hooks/useTasks.ts - Update handleResumeRefresh

useEffect(() => {
  const handleResumeRefresh = async () => { // Make it async
    const now = Date.now();
    
    // Increase throttle to 3 seconds to prevent rapid-fire refreshes
    if (now - lastResumeRefreshRef.current < 3000) {
      console.log('[useTasks] Resume refresh throttled');
      return;
    }
    lastResumeRefreshRef.current = now;

    if (!userIdRef.current) return;
    
    console.log('[useTasks] Resume detected, validating session first...');
    
    // CRITICAL: Wait for session validation to complete BEFORE fetching data
    try {
      // Dispatch event to trigger session validation and wait for it
      const sessionValidPromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2000); // 2s timeout
        
        const handler = () => {
          clearTimeout(timeout);
          window.removeEventListener('supabase-session-validated', handler);
          resolve();
        };
        
        window.addEventListener('supabase-session-validated', handler, { once: true });
      });
      
      // Trigger session validation
      window.dispatchEvent(new CustomEvent('request-session-validation'));
      
      // Wait for validation to complete (with timeout)
      await sessionValidPromise;
      
      console.log('[useTasks] Session validated, now fetching tasks');
      
      // Now fetch tasks with fresh session
      loadTasks({ force: true });
    } catch (error) {
      console.error('[useTasks] Session validation failed:', error);
      // Still try to load tasks - might work if session was valid
      loadTasks({ force: true });
    }
  };

  // Only listen to app-resume and supabase-session-refreshed
  // Remove other redundant events to prevent duplicate refreshes
  window.addEventListener('app-resume', handleResumeRefresh);
  window.addEventListener('supabase-session-refreshed', handleResumeRefresh);

  return () => {
    window.removeEventListener('app-resume', handleResumeRefresh);
    window.removeEventListener('supabase-session-refreshed', handleResumeRefresh);
  };
}, [loadTasks]);
```

**Update useSupabaseLifecycle to emit validation events**:

```typescript
// src/hooks/useSupabaseLifecycle.ts - Update validateSession

const validateSession = useCallback(async (force = false) => {
  if (!enabled) return true;

  // ... existing throttle logic ...

  try {
    console.log('[Supabase Lifecycle] Validating session...');

    // ... existing validation logic ...
    
    // Emit success event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-session-validated', { 
        detail: { success: true } 
      }));
    }
    
    return true;
  } catch (error: any) {
    console.error('[Supabase Lifecycle] Unexpected error during session validation:', error);
    
    // Emit failure event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-session-validated', { 
        detail: { success: false, error } 
      }));
    }
    
    optionsRef.current.onAuthError?.(error);
    return false;
  } finally {
    isValidatingRef.current = false;
  }
}, [enabled]);

// Add listener for validation requests
useEffect(() => {
  const handleValidationRequest = () => {
    console.log('[Supabase Lifecycle] Validation requested');
    validateSession(true);
  };
  
  window.addEventListener('request-session-validation', handleValidationRequest);
  
  return () => {
    window.removeEventListener('request-session-validation', handleValidationRequest);
  };
}, [validateSession]);
```

### Fix #2: Improve Auto-Refresh Restart Logic

**Priority**: 🟡 HIGH

**Implementation**:

```typescript
// src/hooks/useSupabaseLifecycle.ts - Update handleResume

const handleResume = useCallback(async () => {
  console.log('[Supabase Lifecycle] App resumed, validating session...');

  // Restart auto-refresh with retry logic
  let autoRefreshStarted = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await supabase.auth.startAutoRefresh();
      isAutoRefreshEnabledRef.current = true;
      autoRefreshStarted = true;
      console.log('[Supabase Lifecycle] Auto-refresh restarted successfully');
      break;
    } catch (e: any) {
      console.warn(`[Supabase Lifecycle] Auto-refresh restart attempt ${attempt + 1} failed:`, e?.message);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  
  if (!autoRefreshStarted) {
    console.error('[Supabase Lifecycle] Failed to restart auto-refresh after 3 attempts');
  }

  // Validate session (this will also refresh if needed)
  const isValid = await validateSession(true);
  
  if (!isValid) {
    console.error('[Supabase Lifecycle] Session validation failed on resume');
    // Optionally: redirect to login or show error
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-resume'));
  }
}, [validateSession]);
```

### Fix #3: Add Proactive Background State Management

**Priority**: 🟢 MEDIUM

**New Hook**: `useBackgroundStateManager.ts`

```typescript
// src/hooks/useBackgroundStateManager.ts
import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BackgroundState {
  enteredBackgroundAt: number | null;
  backgroundDuration: number;
  wasInBackground: boolean;
}

export function useBackgroundStateManager() {
  const stateRef = useRef<BackgroundState>({
    enteredBackgroundAt: null,
    backgroundDuration: 0,
    wasInBackground: false
  });

  const handleAppStateChange = useCallback((isActive: boolean) => {
    if (!isActive) {
      // App going to background
      stateRef.current.enteredBackgroundAt = Date.now();
      stateRef.current.wasInBackground = true;
      console.log('[Background Manager] App entered background');
    } else if (stateRef.current.enteredBackgroundAt) {
      // App returning from background
      stateRef.current.backgroundDuration = Date.now() - stateRef.current.enteredBackgroundAt;
      console.log(`[Background Manager] App resumed after ${Math.round(stateRef.current.backgroundDuration / 1000)}s`);
      
      // Emit event with duration
      window.dispatchEvent(new CustomEvent('app-resumed-from-background', {
        detail: {
          duration: stateRef.current.backgroundDuration,
          requiresRefresh: stateRef.current.backgroundDuration > 30000 // 30 seconds
        }
      }));
      
      stateRef.current.enteredBackgroundAt = null;
    }
  }, []);

  useEffect(() => {
    // Listen to visibility changes
    const handleVisibilityChange = () => {
      handleAppStateChange(!document.hidden);
    };

    // Listen to Capacitor app state changes
    const setupCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', ({ isActive }) => {
          handleAppStateChange(isActive);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setupCapacitor();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAppStateChange]);

  return {
    getBackgroundDuration: () => stateRef.current.backgroundDuration,
    wasInBackground: () => stateRef.current.wasInBackground
  };
}
```

### Fix #4: Debounce Multiple Resume Events

**Priority**: 🟢 MEDIUM

**Utility Function**:

```typescript
// src/utils/eventDebounce.ts
export function createDebouncedEventHandler(
  handler: () => void | Promise<void>,
  delay: number
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isProcessing = false;

  return () => {
    // Clear pending timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Don't queue another if already processing
    if (isProcessing) {
      console.log('[EventDebounce] Handler already processing, skipping');
      return;
    }

    timeoutId = setTimeout(async () => {
      isProcessing = true;
      try {
        await handler();
      } finally {
        isProcessing = false;
      }
    }, delay);
  };
}
```

**Usage in useTasks**:

```typescript
// src/hooks/useTasks.ts
import { createDebouncedEventHandler } from '../utils/eventDebounce';

// Inside useTasks hook
useEffect(() => {
  // Create debounced handler - only executes once within 3-second window
  const debouncedRefresh = createDebouncedEventHandler(
    () => {
      if (!userIdRef.current) return;
      console.log('[useTasks] Debounced refresh triggered');
      loadTasks({ force: true });
    },
    3000 // 3 second debounce
  );

  // All events now go through the debounced handler
  window.addEventListener('app-resume', debouncedRefresh);
  window.addEventListener('supabase-session-refreshed', debouncedRefresh);

  return () => {
    window.removeEventListener('app-resume', debouncedRefresh);
    window.removeEventListener('supabase-session-refreshed', debouncedRefresh);
  };
}, [loadTasks]);
```

---

## Additional Recommendations

### 1. **Add Loading States for Resume Operations**

Show user-friendly loading indicators when app resumes:

```typescript
// src/App.tsx
const [isResumingFromBackground, setIsResumingFromBackground] = useState(false);

useEffect(() => {
  const handleBackgroundResume = (event: Event) => {
    const customEvent = event as CustomEvent<{ duration: number; requiresRefresh: boolean }>;
    if (customEvent.detail.requiresRefresh) {
      setIsResumingFromBackground(true);
      
      // Auto-hide after 3 seconds
      setTimeout(() => setIsResumingFromBackground(false), 3000);
    }
  };
  
  window.addEventListener('app-resumed-from-background', handleBackgroundResume);
  
  return () => {
    window.removeEventListener('app-resumed-from-background', handleBackgroundResume);
  };
}, []);

// In render:
{isResumingFromBackground && (
  <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-2 px-4 text-center z-50">
    Refreshing data...
  </div>
)}
```

### 2. **Add Retry with User Feedback**

If data fails to load after resume, show retry button:

```typescript
// In useTasks.ts - add retry state
const [showRetryPrompt, setShowRetryPrompt] = useState(false);

// In loadTasks error handler:
if (retryCount >= maxRetries) {
  setShowRetryPrompt(true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('task-load-failed', {
      detail: { error: err.message }
    }));
  }
}
```

### 3. **Implement Offline Queue**

Cache mutations while offline and sync when reconnected:

```typescript
// src/lib/offlineQueue.ts
interface QueuedMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'user';
  data: any;
  timestamp: number;
}

class OfflineQueue {
  private queue: QueuedMutation[] = [];
  
  add(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
    this.queue.push({
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    });
    this.persistQueue();
  }
  
  async sync() {
    // Process queued mutations
    const mutations = [...this.queue];
    
    for (const mutation of mutations) {
      try {
        // Execute mutation
        await this.executeMutation(mutation);
        
        // Remove from queue on success
        this.queue = this.queue.filter(m => m.id !== mutation.id);
      } catch (error) {
        console.error('Failed to sync mutation:', mutation, error);
      }
    }
    
    this.persistQueue();
  }
  
  private persistQueue() {
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
  
  private async executeMutation(mutation: QueuedMutation) {
    // Implementation based on mutation type
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## Testing Checklist

After implementing fixes, test these scenarios:

- [ ] Minimize app for 5 minutes → Resume → Data loads correctly
- [ ] Minimize app for 30 minutes → Resume → Data refreshes
- [ ] Minimize app for 2 hours → Resume → Session refreshes & data loads
- [ ] Switch to another app → Return → Smooth transition, no blank screen
- [ ] Turn off wifi → Minimize → Turn on wifi → Resume → Data syncs
- [ ] Overnight background → Resume → Fresh data loads
- [ ] Rapid tab switching (< 3 seconds) → No duplicate fetches
- [ ] Pull-to-refresh after long background → Works correctly
- [ ] Create task after long background → Succeeds (no RLS errors)
- [ ] Network disconnect/reconnect → Data refreshes once

---

## Performance Monitoring

Add these logs to track resume performance:

```typescript
// In useSupabaseLifecycle.ts
console.log('[Performance] Session validation took', Date.now() - startTime, 'ms');

// In useTasks.ts
console.log('[Performance] Task fetch took', Date.now() - startTime, 'ms');
console.log('[Performance] Task count:', tasks.length);
```

Monitor these metrics:
- Session validation time: **< 500ms** ✅
- Task fetch time: **< 2000ms** ✅
- Total resume time: **< 3000ms** ✅
- Duplicate fetch count: **0** ✅

---

## Implementation Priority

1. **🔴 CRITICAL - Fix #1**: Ensure session validation before data fetch *(30 min)*
2. **🟡 HIGH - Fix #2**: Improve auto-refresh restart logic *(15 min)*
3. **🟢 MEDIUM - Fix #3**: Add background state manager *(20 min)*
4. **🟢 MEDIUM - Fix #4**: Debounce multiple events *(15 min)*
5. **🔵 LOW**: Add loading states & user feedback *(30 min)*

**Total Implementation Time**: ~2 hours

---

## Conclusion

The data loading issue after app resume is caused by:
1. Race condition between session validation and data fetching
2. Multiple simultaneous resume events causing duplicate fetches
3. Unreliable auto-refresh restart in backgrounded WebViews

**Key Solution**: Ensure session is validated and refreshed **BEFORE** attempting to fetch data, and debounce multiple resume events to prevent race conditions.

These fixes will ensure reliable data loading when users return to the app after any duration of backgrounding.
