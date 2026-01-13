# Pull-to-Refresh Stuck Fix (Optimization)

## Issue
The user still perceives the app as "stuck" during pull-to-refresh when the network is unstable.
Although the previous fix reduced the timeout from 45s to 15s, the application was performing **5 retries**.
Math: 5 retries * 15 seconds = **75 seconds** of total loading time before failure.

## Solution
We have further optimized the timeout and retry constants to drastically reduce the maximum wait time while still allowing for reasonable recovery.

### Changes in `src/hooks/useTasks.ts`:
1.  **`TASK_FETCH_TIMEOUT`**: Reduced from `15000` (15s) to `10000` (10s).
2.  **`MAX_RETRIES_TIMEOUT`**: Reduced from `5` to `2`.

### New Behavior
Max wait time = 2 retries * 10 seconds = **20 seconds**.
This is a 73% reduction in wait time (from 75s). The app will now fail gracefully and hide the spinner much faster if the connection is dead, preventing the "stuck" feeling.
