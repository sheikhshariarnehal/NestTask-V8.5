# Bug Fix Summary: Stuck Skeleton / Infinite Loading State

## Issue Description
User reported "stuck on loading data skeleton task" on Android. This occurred even after network and permission fixes were applied. The app would show the skeleton placeholder indefinitely instead of loading tasks or showing an empty state.

## Root Cause Analysis
1.  **Throttling Lock-up in `useTasks`**:
    *   The `useTasks` hook implements a throttle mechanism (3s delay) to prevents excessive network requests.
    *   If `loadTasks()` was called and hit the throttle condition (e.g., during rapid re-renders or tab switches), it would return early.
    *   **CRITICAL BUG**: The `return` statement inside the throttle check did NOT reset `loading` to `false`.
    *   If `useEffect` set `setLoading(true)` just before calling `loadTasks()`, and `loadTasks()` throttled, the component would be left with `loading=true` forever.

2.  **`isInitialLoad` Logic in `UpcomingPage`**:
    *   The `UpcomingPage` component had a state `isInitialLoad` initialized to `true`.
    *   It was NEVER set to `false`.
    *   While this wasn't blocking rendering (since `loading=false` would bypass the check), it was essentially a dead flag that made the component strictly dependent on `loading` state behaving perfectly.

3.  **Race Condition between `App.tsx` and `UpcomingPage.tsx`**:
    *   Both components use `useTasks`.
    *   `App.tsx` starts a fetch. `UpcomingPage` mounts and starts a fetch.
    *   If `UpcomingPage`'s fetch throttled (because `App`'s fetch just updated the timestamp?), it could trigger the bug in #1.

## Fixes Implemented

1.  **Modified `src/hooks/useTasks.ts`**:
    *   Added `if (isMountedRef.current) setLoading(false);` inside the throttle check block.
    *   This guarantees that if a request is skipped due to throttling, the UI loading state is cleared immediately.

2.  **Modified `src/pages/UpcomingPage.tsx`**:
    *   Updated the `useEffect` handling loading timeouts.
    *   Added logic to explicitly set `setIsInitialLoad(false)` when `loading` completes OR when the safety timeout (10s) fires.
    *   This ensures the skeleton UI eventually gives way to the content (or empty state) even if the network hangs.

## Verification
These changes ensure that:
*   **Throttle Safety**: Rapid navigation or background/resume cycles will not leave the app in a "loading" state.
*   **Self-Healing**: If the loading state does stick for 10s, the page voluntarily clears it and shows whatever data it has (or an empty state), preventing a permanent freeze.
