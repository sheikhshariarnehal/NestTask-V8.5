# Pull-to-Refresh Timeout Fix

## Issue
The user reported that the "Pull to Refresh" action resulted in the app "just loading" (stuck spinner).

## Diagnosis
The `TASK_FETCH_TIMEOUT` in `useTasks.ts` was set to **45,000ms (45 seconds)**. 
When the network was slow or the session validation was retrying (as seen in the logs), the configured timeout meant the user had to wait nearly a minute before the app would admit failure and stop the loading spinner. To the user, this appeared as the app being "stuck".

## Log Evidence
```text
useTasks.ts:208 Error fetching tasks: Error: Task fetch timeout
...
useTasks.ts:225 Retrying task fetch in 1817ms
```
The logs confirm the timeout logic is working, but the duration was excessive.

## Fix
Reduced the `TASK_FETCH_TIMEOUT` constant in `src/hooks/useTasks.ts`.

- **Old Value**: `45000` (45 seconds)
- **New Value**: `15000` (15 seconds)

## Impact
If the network is poor or the server is unresponsive, the loading spinner will now dismiss after **15 seconds** instead of 45 seconds, providing much faster feedback to the user and eliminating the perception of the app being frozen.
