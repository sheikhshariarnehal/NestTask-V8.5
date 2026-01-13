# Pull-to-Refresh Stuck Loading Fix

## Problem
The user reported that "pull to refresh" results in an indefinite loading state ("just loading").

## Root Cause
The `useTasks` hook and `task.service.ts` were calling `supabase.auth.getSession()` directly. In some "zombie" states (or on Android/WebView environments), querying the session from local storage can hang indefinitely if the storage is locked or the Supabase client is in an inconsistent state. Since these calls were awaited without a timeout, the `Promise` would never resolve, causing the loading spinner to spin forever.

## Fix Implemented
We have wrapped the `getSession()` calls in a `Promise.race` with a timeout (3-4 seconds).

### Modified Files:
1.  **`src/hooks/useTasks.ts`**:
    - Replaced direct `supabase.auth.getSession()` with a `safeGetSession` helper that times out after 4 seconds.
    - Prevents the initial task load/refresh from hanging.

2.  **`src/services/task.service.ts`**:
    - Replaced direct `supabase.auth.getSession()` with a timeout-wrapped version (3 seconds).
    - Prevents the actual data fetching service from hanging while checking user roles.

## Expected Behavior
If the session retrieval hangs:
1.  The timeout triggers after ~4 seconds.
2.  The code treats it as "no session" or "null session".
3.  The task loading logic proceeds (either attempting validation or failing gracefully).
4.  **Crucially**: The `loading` state is set to `false` in the `finally` block, removing the spinner.
