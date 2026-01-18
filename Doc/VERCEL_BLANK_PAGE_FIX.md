# 🔧 Vercel Deployment Troubleshooting Guide

## ✅ Fixed: Blank Page Issue

### Problem
After deployment, the page shows a loading screen briefly and then becomes blank.

### Root Causes
1. **Missing Environment Variables** - The most common issue
2. **JavaScript Errors** - Uncaught errors crash the app
3. **Router Configuration** - SPA routing not properly configured
4. **Build Issues** - Assets not loading correctly

### Solutions Implemented

#### 1. ✅ Error Boundary Added
Created [ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) that:
- Catches JavaScript errors gracefully
- Shows user-friendly error messages
- Prevents blank page crashes
- Provides reload button
- Shows environment variable configuration guide

#### 2. ✅ Environment Variable Detection
Modified [main.tsx](src/main.tsx) to:
- Check for environment variables on startup
- Display helpful configuration screen if missing
- Log detailed error information to console
- Prevent app crash from missing env vars

#### 3. ✅ Supabase Client Protection
Updated [supabase.ts](src/lib/supabase.ts) to:
- Use dummy values if env vars are missing (prevents immediate crash)
- Store error state for display
- Log configuration issues to console
- Allow app to start and show error screen

#### 4. ✅ Global Error Handling
Added to [main.tsx](src/main.tsx):
- Global error event listeners
- Unhandled promise rejection handlers
- Fallback UI if React fails to render
- Detailed error logging

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] **1. Environment Variables Set in Vercel**
  ```
  Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
  
  Add:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  
  Set for: Production, Preview, Development
  ```

- [ ] **2. Build Locally First**
  ```bash
  npm run build
  ```
  Ensure build completes without errors

- [ ] **3. Test Build Locally**
  ```bash
  npm run preview
  ```
  Test the production build on `http://localhost:4173`

- [ ] **4. Commit All Changes**
  ```bash
  git add .
  git commit -m "Add error handling and deployment fixes"
  git push
  ```

### Deploying

- [ ] **Option 1: Vercel CLI**
  ```bash
  npm run deploy
  ```

- [ ] **Option 2: GitHub Integration**
  - Push to GitHub
  - Vercel auto-deploys

---

## 🐛 Troubleshooting Steps

### Issue: Blank Page After Loading

#### Step 1: Check Console Errors
1. Open deployed site
2. Press `F12` or right-click → Inspect
3. Go to Console tab
4. Look for errors (red text)

**Common Errors:**
```
❌ Missing environment variables
❌ Supabase configuration error
❌ Cannot access before initialization
❌ 404 Not Found (assets)
```

#### Step 2: Verify Environment Variables

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Verify these exist:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Check they're set for **Production**
4. Values should NOT have quotes around them

**If Missing:**
```bash
# Add them in Vercel Dashboard
# Then redeploy:
vercel --prod --force
```

#### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Reload page
3. Look for failed requests (red/404)

**Common Issues:**
- 404 on `/assets/...` → Build output issue
- 404 on `/index.html` → Routing issue
- 403/401 on Supabase → Wrong API keys

#### Step 4: Verify Build Output
```bash
# Check if dist folder has content
ls dist/
ls dist/assets/

# Should see:
# - index.html
# - assets/js/...
# - assets/css/...
```

#### Step 5: Test Routing
Try accessing:
- `https://your-app.vercel.app/` ← Should work
- `https://your-app.vercel.app/auth` ← Should work
- `https://your-app.vercel.app/admin` ← Should work

If any return 404, check [vercel.json](vercel.json):
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## 🔍 What You'll See Now

### With Environment Variables ✅
- App loads normally
- Shows your application content
- Analytics and Speed Insights active

### Without Environment Variables ⚠️
Instead of a blank page, you'll see:
```
┌─────────────────────────────────────┐
│  ⚠️  Configuration Required         │
│                                     │
│  Missing environment variables:     │
│  • VITE_SUPABASE_URL               │
│  • VITE_SUPABASE_ANON_KEY          │
│                                     │
│  [How to fix in Vercel Dashboard]  │
│  [How to fix locally]              │
└─────────────────────────────────────┘
```

### On JavaScript Error 🐛
Instead of a blank page:
```
┌─────────────────────────────────────┐
│  ⚠️  Application Error              │
│                                     │
│  Something went wrong.              │
│  Error: [error message]            │
│                                     │
│  [ Refresh Page ]                  │
└─────────────────────────────────────┘
```

---

## 📝 Environment Variable Setup

### Vercel Dashboard Method (Recommended)

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/[username]/[project]/settings/environment-variables
   ```

2. **Add Variables**
   ```
   Name: VITE_SUPABASE_URL
   Value: https://nglfbbdoyyfslzyjarqs.supabase.co
   Environment: Production, Preview, Development
   
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Environment: Production, Preview, Development
   ```

3. **Redeploy**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Select "Redeploy"
   - OR push a new commit

### Vercel CLI Method

```bash
# Set for production
vercel env add VITE_SUPABASE_URL production
# Paste value when prompted

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste value when prompted

# Deploy
vercel --prod
```

### Local Development

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://nglfbbdoyyfslzyjarqs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 Testing After Deploy

### 1. Basic Functionality
- [ ] Page loads without blank screen
- [ ] Can see login form or main app
- [ ] No console errors

### 2. Error Handling
Test by temporarily removing an env var:
- [ ] Shows configuration error screen (not blank)
- [ ] Error message is clear
- [ ] Provides fix instructions

### 3. Routing
- [ ] All routes work (/, /auth, /admin, etc.)
- [ ] Refresh on any route works
- [ ] No 404 errors

### 4. Analytics
- [ ] Visit Vercel Analytics dashboard
- [ ] Should see page views within 5-10 minutes
- [ ] Speed Insights data appears

---

## 🆘 Still Having Issues?

### Check Vercel Logs
```bash
# View deployment logs
vercel logs [deployment-url]

# View function logs
vercel logs --follow
```

### Enable Debug Mode
In [main.tsx](src/main.tsx), errors are logged to console:
```typescript
// Look for:
console.error('❌ Missing environment variables!');
console.error('Global error:', event.error);
```

### Contact Support
If still stuck, gather this information:
1. Console errors (screenshot)
2. Network tab (screenshot)
3. Environment variables (names only, not values)
4. Vercel deployment URL
5. Steps to reproduce

---

## ✅ Success Indicators

After fixing, you should see:
- ✅ No blank page
- ✅ No console errors
- ✅ App loads and is functional
- ✅ All routes work
- ✅ Analytics tracking
- ✅ Speed Insights data

---

## 📚 Related Files

- [main.tsx](src/main.tsx) - App initialization & error handling
- [ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) - Error UI components
- [supabase.ts](src/lib/supabase.ts) - Supabase client with error handling
- [vercel.json](vercel.json) - Vercel configuration
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick deployment guide

---

**Last Updated**: January 7, 2026  
**Status**: ✅ Blank page issue fixed  
**Changes**: Added comprehensive error handling and environment variable detection
