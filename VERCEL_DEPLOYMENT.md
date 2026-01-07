
# Vercel Deployment Guide

## Overview
This project is optimized for deployment on Vercel with Speed Insights and Analytics enabled.

## Features Enabled
- ✅ Vercel Analytics
- ✅ Vercel Speed Insights
- ✅ Optimized caching headers
- ✅ Security headers
- ✅ Gzip & Brotli compression
- ✅ Code splitting & tree shaking
- ✅ PWA support

## Environment Variables
Before deploying to Vercel, make sure to set up the following environment variables in your Vercel project settings:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment Steps

### 1. Install Vercel CLI (optional)
```bash
npm i -g vercel
```

### 2. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 3. Configure Project Settings
In your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add your Supabase credentials
3. Save changes

### 4. Verify Analytics & Speed Insights
After deployment:
1. Visit your Vercel dashboard
2. Navigate to the Analytics tab to see visitor data
3. Check Speed Insights for performance metrics

## Build Optimizations

### Automatic Optimizations
- **Code Splitting**: Vendor chunks separated for better caching
- **Compression**: Brotli and Gzip enabled
- **Minification**: Terser with aggressive settings
- **Tree Shaking**: Unused code removed
- **Asset Optimization**: Images, fonts, and CSS optimized
- **Cache Headers**: Long-term caching for static assets

### Manual Chunks
The build process creates separate chunks for:
- React core (`react-vendor`)
- UI components (`ui-components`)
- Supabase (`supabase`)
- Vercel Analytics (`vercel-analytics`)
- Icons (`icons`)
- Charts (`charts`)
- Date utilities (`date-utils`)

## Performance Targets
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

## Monitoring
Use Vercel Speed Insights to monitor:
- Core Web Vitals
- Real User Monitoring (RUM)
- Performance scores by page
- Geographic performance data

## Troubleshooting

### Blank Page After Deployment

If you see a loading screen followed by a blank page:

1. **Check Browser Console** (F12):
   - Look for error messages (especially red errors)
   - Common errors:
     - "Missing Supabase environment variables"
     - Network errors
     - Module loading errors

2. **Verify Environment Variables**:
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   # Make sure these are set:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   
   **Important**: After adding/changing environment variables:
   - Go to Deployments tab
   - Click "..." menu on latest deployment
   - Select "Redeploy"
   - Environment variables only apply to NEW deployments!

3. **Check Vercel Build Logs**:
   - Go to Vercel Dashboard → Deployments
   - Click on the deployment
   - Check "Build Logs" for errors
   - Look for:
     - Failed module imports
     - Missing dependencies
     - Build errors

4. **Common Fixes**:
   
   **Missing Environment Variables:**
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Redeploy after setting

   **Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear site data in DevTools

   **Service Worker Issues:**
   - Open DevTools → Application → Service Workers
   - Click "Unregister" if present
   - Hard refresh the page

### Build Fails
- Check environment variables are set
- Verify all dependencies are installed
- Review build logs in Vercel dashboard

### Analytics Not Working
- Ensure you're in production environment
- Check that @vercel/analytics is installed
- Verify the components are imported in main.tsx

### Slow Performance
- Check Speed Insights dashboard
- Review bundle analyzer (run `npm run analyze`)
- Optimize large dependencies
- Consider lazy loading more components

## Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Additional Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Speed Insights Docs](https://vercel.com/docs/speed-insights)
- [Web Vitals Guide](https://web.dev/vitals/)
