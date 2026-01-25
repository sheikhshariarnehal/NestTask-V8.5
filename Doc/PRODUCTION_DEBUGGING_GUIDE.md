# Production Debugging Guide for NestTask

This guide explains how to enable comprehensive debugging in both development and production environments.

## Quick Start - Enable Debugging

### Method 1: URL Parameter (Recommended for Production)
Add `?debug=true` to any URL:
```
https://your-app.vercel.app/?debug=true
```

This will automatically enable:
- Verbose logging
- Debug mode
- All console logs
- Workbox service worker details

### Method 2: Browser Console
Open the browser console and run:
```javascript
// Enable verbose logging
localStorage.setItem('nesttask_verbose', 'true');
localStorage.setItem('nesttask_debug', 'true');

// Reload the page
window.location.reload();
```

### Method 3: Using the Debug Utility
```javascript
// Enable debug mode
window.__nestDebug.enableDebug();

// Enable verbose logging
window.__nestDebug.enableVerbose();

// Reload the page
window.location.reload();
```

## Available Debug Commands

The app exposes a global `window.__nestDebug` object with useful debugging utilities:

### Get Current Status
```javascript
// Get comprehensive app status
window.__nestDebug.getStatus();

// Returns:
// - appRunningFor: How long the app has been running
// - timeSinceActive: Time since last user interaction
// - sessionExpiresIn: When the session will expire
// - connectionState: Network connection status
// - And more...
```

### View Debug Logs
```javascript
// Get all debug logs
window.__nestDebug.getLogs();

// Clear debug logs
window.__nestDebug.clearLogs();
```

### Diagnose Issues
```javascript
// Run comprehensive diagnostics
window.__nestDebug.diagnose();

// This will check for:
// - Session expiration
// - Connection issues
// - Inactivity problems
// - Data fetching status
```

### Enable/Disable Logging
```javascript
// Enable verbose logging
window.__nestDebug.enableVerbose();

// Disable verbose logging
window.__nestDebug.disableVerbose();

// Enable debug mode
window.__nestDebug.enableDebug();
```

## Understanding Console Output

### Development Environment
In development, you'll see:
- ✅ All console logs
- ✅ Workbox service worker logs
- ✅ Network requests
- ✅ Detailed component lifecycle logs

### Production Environment (Without Debug Mode)
By default, production shows:
- ✅ Error messages
- ✅ Warning messages
- ✅ Important lifecycle events
- ❌ Verbose debug logs (hidden)
- ❌ Workbox details (hidden)

### Production Environment (With Debug Mode Enabled)
With `?debug=true` or debug flags enabled:
- ✅ All console logs
- ✅ Detailed debugging information
- ✅ Service worker cache operations
- ✅ Network request details
- ✅ Session validation logs

## Common Debugging Scenarios

### 1. Blank Page After Deployment
```javascript
// Check if session is valid
window.__nestDebug.getStatus();

// Look for: isSessionExpired, sessionExpiresIn
// If expired, user needs to log in again
```

### 2. Data Not Loading
```javascript
// Check data fetch status
window.__nestDebug.diagnose();

// Look for: timeSinceDataFetch, connectionState
// Check network tab for failed requests
```

### 3. Service Worker Issues
Enable debug mode to see all service worker operations:
```
https://your-app.vercel.app/?debug=true
```

Look for console messages like:
- `workbox Router is responding to: [URL]`
- `workbox Found a cached response in '[cache-name]'`
- `workbox Network request for '[URL]' returned a response with status '[code]'`

### 4. Session Expiration Issues
```javascript
// Check session status
const status = window.__nestDebug.getStatus();
console.log('Session expires in:', status.sessionExpiresIn);
console.log('Is expired:', status.isSessionExpired);
```

### 5. Vercel Analytics Blocked
If you see:
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
/_vercel/insights/script.js
```

This is caused by **ad blockers** blocking Vercel's analytics scripts. This is normal and doesn't affect app functionality. To fix:
- Disable ad blocker extensions
- Or whitelist your Vercel domain

## Persistent Debug Mode

To keep debug mode enabled across sessions:

1. Enable via URL parameter once: `?debug=true`
2. Or set localStorage flags manually:
   ```javascript
   localStorage.setItem('nesttask_debug', 'true');
   localStorage.setItem('nesttask_verbose', 'true');
   ```

These flags persist until you clear browser data or disable them:
```javascript
window.__nestDebug.disableVerbose();
localStorage.removeItem('nesttask_debug');
```

## Production-Specific Logging

### What Gets Logged in Production
The app is configured to preserve console logs in production builds:
- ✅ `console.log()` - Preserved
- ✅ `console.error()` - Preserved
- ✅ `console.warn()` - Preserved
- ✅ `console.info()` - Preserved
- ❌ `debugger` statements - Removed

### Vite Configuration
```typescript
// vite.config.ts
terserOptions: {
  compress: {
    drop_console: false,  // ✅ Keep console logs
    drop_debugger: true,  // ❌ Remove debugger statements
  }
}
```

## Monitoring Performance

### Check Resource Loading
```javascript
// View preloaded resources
performance.getEntriesByType('navigation');
performance.getEntriesByType('resource');
```

### Check Service Worker Status
```javascript
// Check if service worker is active
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Active Service Workers:', registrations);
});
```

### View Cache Contents
```javascript
// List all caches
caches.keys().then(names => {
  console.log('Available caches:', names);
  
  // View specific cache
  caches.open('workbox-precache-v2-https://your-app.vercel.app/').then(cache => {
    cache.keys().then(keys => {
      console.log('Cached URLs:', keys.map(k => k.url));
    });
  });
});
```

## Troubleshooting Checklist

- [ ] Enable debug mode via URL: `?debug=true`
- [ ] Check browser console for errors
- [ ] Run diagnostics: `window.__nestDebug.diagnose()`
- [ ] Check network tab for failed requests
- [ ] Verify Supabase environment variables are set
- [ ] Check if ad blocker is interfering
- [ ] Clear service worker cache if needed
- [ ] Check session expiration status
- [ ] Verify internet connection

## Disabling Debug Mode

To disable debug mode and reduce console noise:

```javascript
// Method 1: Remove URL parameter
// Just remove ?debug=true from the URL

// Method 2: Disable via console
localStorage.removeItem('nesttask_debug');
localStorage.removeItem('nesttask_verbose');
window.location.reload();

// Method 3: Use debug utility
window.__nestDebug.disableVerbose();
```

## Advanced: Custom Logging

You can add your own debug logs that respect the debug mode:

```typescript
import { debugLog, isDebugMode } from './lib/debug';

// This will only log when debug mode is enabled
debugLog('MyComponent', 'User clicked button', { userId: '123' });

// Check if debug mode is active
if (isDebugMode()) {
  console.log('Debug mode is active');
}
```

## Support

If you encounter issues not covered in this guide:
1. Enable debug mode
2. Reproduce the issue
3. Run `window.__nestDebug.diagnose()`
4. Export the logs: `copy(window.__nestDebug.getLogs())`
5. Share the logs for analysis

---

**Note**: Debug mode may increase memory usage and slow down the app slightly. Disable it when not actively debugging.
