# Android App Debugging & Fixes

## Issues Identified & Fixed

### 1. Network Security (Cleartext Traffic)
**Issue:** Android blocks non-HTTPS (HTTP) traffic by default. If your app communicates with any server that isn't strictly HTTPS (or if an auth redirect briefly touches HTTP), the request will fail silently or hang.
**Fix:** Added `android:usesCleartextTraffic="true"` to `AndroidManifest.xml`.
```xml
<application
    ...
    android:usesCleartextTraffic="true"
    ...
>
```

### 2. Service Worker Conflict (PWA vs Native)
**Issue:** Running `npm run build` creates a Progressive Web App (PWA) with a Service Worker (`sw.js`).
- When run inside the Android app (Capacitor), the Service Worker intercepts requests and can cause caching issues, "zombie" states, or blank screens because the file handling differs from a web browser.
- Your `vite.config.ts` correctly disables the PWA plugin, **BUT only if** the `CAPACITOR_BUILD` environment variable is set.

**Solution:**
ALWAYS use the specific Android build command, never the standard build command, when deploying to mobile.

**Correct Command:**
```powershell
npm run android:build
```
*(This runs: `set CAPACITOR_BUILD=true && tsc && vite build && npx cap sync android`)*

**Incorrect Command:**
`npm run build` -> `npx cap sync` (This will break the Android app by including the PWA Service Worker).

### 3. Debugging on Android
To see the logs (which are now enabled) on your Android device:
1. Run `npm run android:open` (opens Android Studio).
2. Run the app on an Emulator or Device.
3. Look at the **Logcat** tab at the bottom of Android Studio.
4. Filter by `console` or `WebConsole` to see your app's logs.

## Recommended Next Steps
1. Run the correct build command:
   ```powershell
   npm run android:build
   ```
2. Open in Android Studio to test:
   ```powershell
   npm run android:open
   ```
3. If the app is still stuck, check the Logcat for specific error messages (e.g., `ERR_CONNECTION_REFUSED`, `401 Unauthorized`).
