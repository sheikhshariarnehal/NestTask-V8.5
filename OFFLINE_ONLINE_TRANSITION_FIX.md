# Offline→Online Transition Fix

## Problem Summary

When users opened the app after extended inactivity and the network transitioned from offline to online, the UI would get stuck showing "0 tasks" even though:
- The API successfully returned data (HTTP 200, 30 tasks in response body)
- The backend was working correctly
- The network connection was restored

## Root Cause

The browser's `fetch()` API has special behavior during offline→online transitions:

1. When a fetch request starts while offline, the browser creates an AbortController
2. If the network comes back online during the request, the browser aborts the in-flight request
3. This throws an `AbortError: signal is aborted without reason`
4. Even if a retry succeeds and data loads, the original error propagates and prevents UI updates

**Critical Detail**: The AbortError has no `reason` property, indicating it was browser-initiated (not code-initiated).

## The Fix

### File: `src/hooks/useTasks.ts`

Added detection for browser-initiated AbortError during offline→online transitions:

```typescript
// After fetch attempt in catch block
const isAbortError = err?.name === 'AbortError' || err?.message?.includes('AbortError');
const wasOfflineNowOnline = isAbortError && navigator.onLine && signal.aborted && !(signal as any).reason;

if (wasOfflineNowOnline) {
  console.log('[useTasks] Browser aborted fetch during offline→online transition, retrying immediately...');
  setLoading(false);
  loadingRef.current = false;
  // Retry immediately with force flag to bypass any caching
  setTimeout(() => loadTasks({ force: true }), 100);
  return;
}
```

### Detection Logic

1. **Check for AbortError**: `err?.name === 'AbortError'` or message contains 'AbortError'
2. **Confirm online**: `navigator.onLine === true`
3. **Verify abort**: `signal.aborted === true`
4. **Distinguish browser vs code abort**: `!(signal as any).reason` - no reason means browser-initiated

### Recovery Strategy

1. Clear loading state to unblock UI
2. Reset loading ref to allow new requests
3. Schedule immediate retry (100ms delay) with `force: true` flag
4. Return early to prevent error propagation

## Testing Results

### Before Fix
```
❌ Network: offline → online
❌ API: HTTP 200, 30 tasks returned
❌ Console: "AbortError: signal is aborted without reason"
❌ UI: Stuck at "0 Total Tasks"
❌ User experience: Looks broken
```

### After Fix
```
✅ Network: offline → online
✅ API: HTTP 200, 30 tasks returned
✅ Console: "[useTasks] Browser aborted fetch during offline→online transition, retrying immediately..."
✅ UI: Shows "30 Total Tasks" correctly
✅ User experience: Seamless recovery
```

## Deployment Status

- ✅ Built: `npm run build` completed
- ✅ Committed: Git commit `2a9343c`
- ✅ Deployed: Vercel deployment triggered
- ✅ Android synced: `npx cap sync android`
- ✅ PWA tested: Chrome DevTools MCP verification passed

## Related Fixes

This complements the earlier fix for Android WebView SDK deadlock:
- **First fix**: Bypass Supabase SDK with direct HTTP calls for token refresh
- **This fix**: Handle browser AbortError during network transitions

Together, these ensure reliable data loading on:
- Android native app after extended inactivity
- PWA after offline→online transitions
- All platforms during network instability

## How to Test

### Manual Testing
1. Open app and ensure it loads data
2. Toggle network offline (DevTools Network tab or airplane mode)
3. Wait 3 seconds
4. Toggle network back online
5. Verify UI updates with task count within 5 seconds

### Chrome DevTools MCP Testing
```javascript
// See test results in this document's testing section above
// All tests passed with UI correctly showing 30 tasks after recovery
```

## Related Files

- [src/hooks/useTasks.ts](src/hooks/useTasks.ts) - Main fix location
- [src/lib/supabase.ts](src/lib/supabase.ts) - Direct HTTP token refresh
- [APP_RESUME_DATA_LOADING_FIX.md](APP_RESUME_DATA_LOADING_FIX.md) - Extended inactivity fixes

## Date

January 15, 2025
