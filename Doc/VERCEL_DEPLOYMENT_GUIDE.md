# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Project to Vercel
```bash
vercel link
```

### 4. Set Environment Variables
You can either set them via the Vercel Dashboard or CLI:

#### Option A: Using Vercel Dashboard
1. Go to your project on Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `VITE_SUPABASE_URL` = `https://nglfbbdoyyfslzyjarqs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
   - `NODE_ENV` = `production`

#### Option B: Using Vercel CLI
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add NODE_ENV production
```

### 5. Deploy to Vercel

#### Deploy to Preview
```bash
vercel
```

#### Deploy to Production
```bash
vercel --prod
```

## Project Configuration

### Build Settings (vercel.json)
- **Build Command**: `node vercel-build.cjs`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher

### Features Enabled
✅ **Vercel Analytics** - Automatically tracks page views and user interactions  
✅ **Speed Insights** - Monitors Core Web Vitals and performance metrics  
✅ **Gzip & Brotli Compression** - Optimized asset delivery  
✅ **Asset Caching** - 1 year cache for static assets  
✅ **Service Worker** - PWA support for offline functionality  

## Optimization Features

### 1. Code Splitting
- React vendors separated for better caching
- Ionic/Supabase/Capacitor vendors in separate chunks
- Charts and utilities lazy-loaded on demand

### 2. Asset Optimization
- Images optimized and cached
- CSS code-split for faster initial load
- Fonts preloaded and cached

### 3. Security Headers
- CSP (Content Security Policy) enabled
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options, X-Content-Type-Options
- Vercel Analytics domains whitelisted

### 4. Performance
- Service Worker for offline support
- DNS prefetch for Supabase
- Lazy loading for admin pages
- Optimized chunk sizes

## Monitoring

### Analytics Dashboard
Visit: `https://vercel.com/[your-team]/[your-project]/analytics`

### Speed Insights
Visit: `https://vercel.com/[your-team]/[your-project]/speed-insights`

## Troubleshooting

### Build Fails
1. Check environment variables are set correctly
2. Verify `.env.production` exists with correct values
3. Check build logs: `vercel logs [deployment-url]`

### Analytics Not Working
1. Ensure you're in production mode
2. Check browser console for errors
3. Verify CSP headers allow Vercel domains

### Performance Issues
1. Check Speed Insights for Core Web Vitals
2. Review bundle size with `npm run analyze`
3. Check Network tab for large assets

## Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs [deployment-url]

# List deployments
vercel ls

# Remove project from Vercel
vercel remove [project-name]

# Check project status
vercel inspect [deployment-url]
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Check Analytics is tracking
- [ ] Verify Speed Insights is working
- [ ] Test PWA functionality
- [ ] Check service worker registration
- [ ] Verify Supabase connection
- [ ] Test all routes/pages load correctly
- [ ] Check mobile responsiveness
- [ ] Verify admin/super-admin access

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [Speed Insights Docs](https://vercel.com/docs/speed-insights)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)

## Support

For issues or questions:
1. Check Vercel build logs
2. Review this guide
3. Contact your team lead
