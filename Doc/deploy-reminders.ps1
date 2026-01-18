# Task Reminder Notification - Deployment Script for Windows
# This script deploys the fixed Edge Functions to Supabase

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Task Reminder Notification - Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Deploy task-due-reminder function
Write-Host "📤 Deploying task-due-reminder function..." -ForegroundColor Yellow
supabase functions deploy task-due-reminder

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ task-due-reminder deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy task-due-reminder" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy test function
Write-Host "📤 Deploying test-task-reminder function..." -ForegroundColor Yellow
supabase functions deploy test-task-reminder

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ test-task-reminder deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy test-task-reminder" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ All functions deployed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Rebuild Android app: npm run build && npx cap sync android"
Write-Host "2. Test the function: Call test-task-reminder endpoint"
Write-Host "3. Monitor logs in Supabase Dashboard"
Write-Host ""
Write-Host "Test URL:" -ForegroundColor Yellow
Write-Host "https://YOUR_PROJECT.supabase.co/functions/v1/test-task-reminder"
Write-Host ""
