# Quick Vercel Deployment Script
# Run this script to deploy to Vercel

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  NestTask Vercel Deployment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
} else {
    Write-Host "Vercel CLI found!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Running production build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host ""
    
    # Ask user which deployment type
    Write-Host "Select deployment type:" -ForegroundColor Cyan
    Write-Host "1. Preview deployment (test first)" -ForegroundColor White
    Write-Host "2. Production deployment" -ForegroundColor White
    $choice = Read-Host "Enter choice (1 or 2)"
    
    Write-Host ""
    
    if ($choice -eq "1") {
        Write-Host "Deploying to preview..." -ForegroundColor Yellow
        vercel
    } elseif ($choice -eq "2") {
        Write-Host "Deploying to production..." -ForegroundColor Yellow
        vercel --prod
    } else {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================" -ForegroundColor Green
        Write-Host "  Deployment Successful! 🚀" -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Visit your deployment URL" -ForegroundColor White
        Write-Host "2. Check Analytics dashboard" -ForegroundColor White
        Write-Host "3. Monitor Speed Insights" -ForegroundColor White
        Write-Host "4. Test all features" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Deployment failed. Check errors above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "Build failed. Please fix errors and try again." -ForegroundColor Red
    exit 1
}
