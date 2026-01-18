# 🚀 Quick Deploy to Vercel

## ⚡ One-Command Deployment

```bash
npm run deploy
```

## 📋 Before First Deploy

### 1. Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Set Environment Variables in Vercel Dashboard
Go to: **Project Settings → Environment Variables**

Add these variables:
```
VITE_SUPABASE_URL=https://nglfbbdoyyfslzyjarqs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbGZiYmRveXlmc2x6eWphcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTgyMTQsImV4cCI6MjA4MzE3NDIxNH0.3sXujO3rtin57rTcHpXHi6Zfi9XJCEX3-mmcnnB8cJE
```

## 🎯 Deployment Options

### Option 1: NPM Script (Easiest)
```bash
npm run deploy
```

### Option 2: PowerShell Script (Windows)
```powershell
.\deploy-vercel.ps1
```

### Option 3: Manual Vercel CLI
```bash
vercel --prod
```

### Option 4: GitHub Integration (Automatic)
1. Push to GitHub
2. Connect repo in Vercel Dashboard
3. Auto-deploys on every push

## ✅ What's Already Configured

- ✅ Vercel Analytics installed
- ✅ Speed Insights enabled
- ✅ Build optimizations applied
- ✅ Headers configured
- ✅ Routes configured
- ✅ .vercelignore created
- ✅ Environment variables documented
- ✅ Build tested successfully

## 📊 After Deployment

### View Your App
```
https://[your-project-name].vercel.app
```

### Check Analytics
```
https://vercel.com/[username]/[project]/analytics
```

### View Speed Insights
```
https://vercel.com/[username]/[project]/speed-insights
```

## 🔧 Build Settings (Auto-Detected)

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

## 🚨 Common Issues

**Build fails?**
```bash
# Clear cache and rebuild
vercel --prod --force
```

**Environment variables not working?**
- Check they're set in Vercel Dashboard
- Make sure they're set for "Production"
- Redeploy after adding variables

**Need to rollback?**
- Go to Vercel Dashboard → Deployments
- Click "..." on previous deployment
- Select "Promote to Production"

## 💡 Pro Tips

1. **Preview Deployments**: Every branch gets a preview URL
2. **Instant Rollbacks**: One-click rollback to any previous deployment
3. **Edge Network**: Your app is deployed to global edge locations
4. **Auto SSL**: HTTPS enabled automatically
5. **Custom Domains**: Add your domain in Project Settings

## 📞 Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Full Setup Details](./VERCEL_DEPLOYMENT_READY.md)

---

**Status**: ✅ Ready to Deploy
**Last Build**: Successful
**Optimizations**: Complete
