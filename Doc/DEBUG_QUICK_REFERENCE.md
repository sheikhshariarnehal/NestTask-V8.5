# 🐛 NestTask Debug Quick Reference

## 🚀 Enable Debug Mode

### Option 1: URL Parameter (Fastest)
```
Add ?debug=true to any URL
Example: https://nesttask.vercel.app/?debug=true
```

### Option 2: Browser Console
```javascript
localStorage.setItem('nesttask_debug', 'true');
localStorage.setItem('nesttask_verbose', 'true');
location.reload();
```

### Option 3: Debug Utility
```javascript
window.__nestDebug.enableDebug();
window.__nestDebug.enableVerbose();
location.reload();
```

---

## 🔧 Debug Commands

| Command | Description |
|---------|-------------|
| `window.__nestDebug.getStatus()` | Get comprehensive app status |
| `window.__nestDebug.getLogs()` | View all debug logs |
| `window.__nestDebug.diagnose()` | Run full diagnostics |
| `window.__nestDebug.clearLogs()` | Clear debug logs |
| `window.__nestDebug.enableVerbose()` | Enable verbose logging |
| `window.__nestDebug.disableVerbose()` | Disable verbose logging |

---

## 📊 Common Debugging Scenarios

### Blank Page After Deployment
```javascript
window.__nestDebug.diagnose();
// Look for: isSessionExpired, sessionExpiresIn
```

### Data Not Loading
```javascript
const status = window.__nestDebug.getStatus();
console.log(status.timeSinceDataFetch);
console.log(status.connectionState);
```

### Session Issues
```javascript
const status = window.__nestDebug.getStatus();
console.log('Session expires in:', status.sessionExpiresIn);
console.log('Is expired:', status.isSessionExpired);
```

### Service Worker Issues
```
1. Add ?debug=true to URL
2. Reload page
3. Check console for "workbox" messages
```

---

## 🎯 What You'll See

### Debug Mode OFF (Default)
- Errors and warnings only
- Clean console
- Minimal logging

### Debug Mode ON
- ✅ All lifecycle events
- ✅ Network requests
- ✅ Service worker operations
- ✅ Session validation
- ✅ Cache operations
- ✅ Data fetching details

---

## 🛑 Disable Debug Mode

```javascript
localStorage.removeItem('nesttask_debug');
localStorage.removeItem('nesttask_verbose');
location.reload();
```

Or simply remove `?debug=true` from URL and reload.

---

## ⚠️ Known Issues

### Vercel Analytics Blocked
```
ERR_BLOCKED_BY_CLIENT
/_vercel/insights/script.js
```
**Cause**: Ad blocker
**Fix**: Disable ad blocker or whitelist domain
**Impact**: None (analytics only)

### Workbox Warnings (Development)
```
workbox Precaching did not find a match for /src/main.tsx
```
**Cause**: Vite dev server serves files dynamically
**Fix**: Normal behavior in development
**Impact**: None (production uses pre-cached files)

---

## 📚 Full Documentation
See [PRODUCTION_DEBUGGING_GUIDE.md](./PRODUCTION_DEBUGGING_GUIDE.md) for complete documentation.

---

**Pro Tip**: Bookmark this URL for instant debug mode:
```
https://nesttask.vercel.app/?debug=true
```
