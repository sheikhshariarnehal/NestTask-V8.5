# Fix Report: Android Infinite Loading Loop

## Problem Analysis
The Android app was stuck in an infinite loading/failure loop where:
1. `useAuth` successfully loaded the user from local cache (Offline Mode works).
2. But `useTasks` tried to validate the Supabase Session.
3. Supabase's `getSession()` timed out (due to slow network/contention on Android).
4. `useTasks` threw "Session not ready" error.
5. The UI retried indefinitely, never showing the cached tasks.

## The Fix
Modified `src/hooks/useTasks.ts` to implement a **Task Cache Failover Strategy**:

1.  **Check Cache First:** Before even validating the session, check if we have valid tasks in memory. If yes, show them immediately. (Fixes "Loading..." flicker).
2.  **Offline Fallback:** If Session Validation fails or times out (which is common on flaky mobile networks), instead of throwing an error, we now check the cache *again*.
    - If cache exists -> Show cached tasks + "Offline Mode" warning.
    - If no cache -> Only then show the error.
3.  **Increased Timeouts:**
    - `safeGetSession` timeout increased from `4000ms` -> `8000ms`.
    - `requestSessionValidation` check increased to `4000ms`.

## Verification Steps
1. The build has been updated.
2. Run `npm run android:open` to open Android Studio.
3. Run the app on an Emulator/Device.
4. **Expected Result:** The app should load instantly (if you've opened it before) or fail gracefully to "Offline Mode" instead of being stuck on a spinner/error loop.
