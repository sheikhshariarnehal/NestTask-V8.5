#!/bin/bash

# Task Reminder Notification - Deployment Script
# This script deploys the fixed Edge Functions to Supabase

echo "========================================="
echo "Task Reminder Notification - Deployment"
echo "========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Deploy task-due-reminder function
echo "📤 Deploying task-due-reminder function..."
supabase functions deploy task-due-reminder

if [ $? -eq 0 ]; then
    echo "✅ task-due-reminder deployed successfully"
else
    echo "❌ Failed to deploy task-due-reminder"
    exit 1
fi

echo ""

# Deploy test function
echo "📤 Deploying test-task-reminder function..."
supabase functions deploy test-task-reminder

if [ $? -eq 0 ]; then
    echo "✅ test-task-reminder deployed successfully"
else
    echo "❌ Failed to deploy test-task-reminder"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ All functions deployed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Rebuild Android app: npm run build && npx cap sync android"
echo "2. Test the function: Call test-task-reminder endpoint"
echo "3. Monitor logs in Supabase Dashboard"
echo ""
echo "Test URL:"
echo "https://YOUR_PROJECT.supabase.co/functions/v1/test-task-reminder"
echo ""
