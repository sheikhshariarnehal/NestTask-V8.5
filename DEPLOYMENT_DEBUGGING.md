# PWA Production Logs & "Stuck Loading" Troubleshooting

## Issue Noted
The user reports:
1.  **Stuck Loading**: The deployed PWA gets stuck loading data on first open (but works locally).
2.  **Missing Logs**: Console logs are missing in the deployed production build, preventing debugging.

## Fix Implemented (Phase 1: Regain Visibility)
The primary issue right now is the lack of visibility into *why* the production PWA is stuck. The Vite configuration was aggressively stripping `console.log` statements in production builds.

### Modified `vite.config.ts`:
- **Change**: Switched `minify` from `terser` to `esbuild` for web builds.
- **Change**: Disabled `terserOptions` (which had `drop_console: true`).
- **Result**: Production builds will now retain `console.log` and `console.warn`, allowing us to see error messages, Supabase timeouts, and Lifecycle events in the deployed app's DevTools console.

## Next Steps for User
1.  **Redeploy**: Deploy the application again with these changes.
2.  **Open Deployed App**: Open the PWA on your device or browser.
3.  **Inspect Console**: Open Chrome DevTools (F12) or inspect the attached device.
4.  **Look for Errors**:
    - **CORS Errors**: `Access to fetch at ... from origin ... has been blocked by CORS policy`.
    - **Auth Errors**: `Invalid Refresh Token` or `Session missing`.
    - **Network Errors**: `Failed to fetch`.

## Potential Causes for "Stuck Loading" in Production
While we wait for logs, here are the likely culprits:
1.  **Supabase URL/Key**: Ensure the production environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are correctly set in Vercel/Netlify.
2.  **Service Worker**: The caching logic might be serving an old `index.html` that points to old JS hashes. Try "Hard Refresh" (Ctrl+F5) or Unregister Service Worker in DevTools > Application.
3.  **RLS Policies**: If you are using a different user in prod vs local, ensure the user has the correct permissions.

**Please check the logs in the deployed app after this update and share any red errors you see.**
