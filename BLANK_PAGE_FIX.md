# Blank Page After Deployment - Quick Fix Guide

## Problem
After deploying to Vercel, you see a loading screen that disappears, leaving a blank white page.

## Most Common Cause: Missing Environment Variables

### Step 1: Check Browser Console
1. Open your deployed site
2. Press `F12` (or right-click → Inspect)
3. Go to the **Console** tab
4. Look for errors (red text)

### Step 2: Verify Environment Variables in Vercel

**Go to Vercel Dashboard:**
1. Open https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Verify these are set:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**If missing, add them:**
1. Click "Add New"
2. Enter name: `VITE_SUPABASE_URL`
3. Enter value: `https://your-project.supabase.co`
4. Select all environments: Production, Preview, Development
5. Click "Save"
6. Repeat for `VITE_SUPABASE_ANON_KEY`

### Step 3: Redeploy After Adding Variables

**IMPORTANT:** Environment variables only apply to NEW deployments!

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **three dots (...)** menu
4. Select **Redeploy**
5. Wait for deployment to complete

## Other Common Issues

### Issue: Cached Old Version
**Solution:** Hard refresh your browser
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Issue: Service Worker Problem
**Solution:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers**
4. Click **Unregister** if any are listed
5. Hard refresh the page

### Issue: Supabase Connection Error
**Console Error:** "Missing Supabase environment variables"

**Solution:**
1. Verify environment variables are set correctly
2. Make sure there are no extra spaces in the values
3. Ensure the Supabase URL starts with `https://`
4. Redeploy after making changes

### Issue: JavaScript Module Error
**Console Error:** "Failed to fetch dynamically imported module"

**Solution:**
1. Clear browser cache
2. Try in incognito/private mode
3. Check if all dependencies are in package.json
4. Redeploy to Vercel

## Debugging Commands

### View console logs in production:
```javascript
// The app now logs important info in production
// Open browser console to see:
// - Environment variable status
// - Supabase connection status
// - Any error messages
```

### Check if environment variables are loaded:
Open browser console and type:
```javascript
console.log('Has Supabase URL:', !!import.meta.env.VITE_SUPABASE_URL);
```

## Expected Console Output (Healthy App)

When the app loads correctly, you should see:
```
[Debug] Running in production mode - checking environment variables
[Supabase] Environment check: {hasUrl: true, hasKey: true, urlPrefix: "https://hsmuxnsfzkf..."}
Service worker registered successfully
```

## If Still Not Working

1. **Check Network Tab:**
   - Open DevTools → Network tab
   - Reload page
   - Look for failed requests (red)
   - Check if JavaScript files are loading

2. **Try Different Browser:**
   - Test in Chrome, Firefox, Safari
   - Use incognito mode

3. **Check Vercel Build Logs:**
   - Go to Deployments → Click deployment
   - View "Build Logs"
   - Look for build errors

4. **Contact for Help:**
   - Share browser console errors
   - Share Vercel build logs
   - Share Network tab errors

## Prevention

Always set environment variables BEFORE first deployment:
1. Set up environment variables in Vercel
2. Deploy the project
3. Verify the site works

## Quick Checklist

- [ ] Environment variables set in Vercel
- [ ] Redeployed after adding variables
- [ ] Hard refreshed browser
- [ ] Checked browser console for errors
- [ ] Tried incognito mode
- [ ] Service worker unregistered (if present)
- [ ] Verified Supabase URL is correct

---

**Still stuck?** Check the browser console and share the error messages!
