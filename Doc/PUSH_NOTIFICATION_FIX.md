# Push Notification Fix Summary

## Problem
Push notifications were not working because **Firebase Cloud Messaging SDK was missing** from the Android app dependencies.

## What Was Fixed

### 1. Added Firebase Dependencies
Updated [android/app/build.gradle](android/app/build.gradle) to include:
```groovy
// Firebase Cloud Messaging for Push Notifications
implementation platform('com.google.firebase:firebase-bom:33.7.0')
implementation 'com.google.firebase:firebase-messaging'
```

### 2. Rebuilt the App
- Cleaned previous build: `gradlew clean`
- Rebuilt with FCM: `gradlew assembleDebug`
- **New APK location**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Build time**: January 5, 2026, 3:32 AM

## What's Already Configured

✅ **Firebase Configuration**
- `google-services.json` is properly configured
- Project ID: `nesttask-73c13`
- Package: `com.nesttask.app`

✅ **Android Manifest**
- Push notification permissions declared
- FCM default notification channel: `tasks`
- Click action intent filter configured

✅ **Capacitor Configuration**
- Push notification plugin installed (`@capacitor/push-notifications@8.0.0`)
- Plugin configured in [capacitor.config.ts](capacitor.config.ts)

✅ **Code Implementation**
- Push notification registration in [usePushNotifications.ts](src/hooks/usePushNotifications.ts)
- Auto-registration when user logs in (native platforms only)
- FCM token storage in Supabase `fcm_tokens` table
- Deep linking support for task notifications

✅ **Database**
- `fcm_tokens` table exists with proper RLS policies
- Token upsert mechanism prevents duplicates
- Platform tracking (android/ios/web)

## Testing Steps

### 1. Install the New APK
```bash
# Install on connected device or emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or copy to device and install manually
```

### 2. Test Push Registration
1. Open the app
2. Log in with your account
3. The app should automatically request notification permission
4. Grant permission when prompted
5. Check the console logs for "Push registration success"

### 3. Verify Token Storage
Check Supabase dashboard → `fcm_tokens` table:
- Your user_id should have an entry
- `is_active` should be `true`
- Platform should be `android`
- Token should be populated

### 4. Send Test Notification

#### Option A: Using Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Create new campaign
3. Enter notification title and body
4. Target: Select your app
5. Send test message to your FCM token

#### Option B: Using API (from backend/Edge Function)
```javascript
const admin = require('firebase-admin');

await admin.messaging().send({
  token: 'YOUR_FCM_TOKEN_FROM_DATABASE',
  notification: {
    title: 'Test Notification',
    body: 'Push notifications are working!'
  },
  data: {
    page: 'home'
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'tasks',
      sound: 'default'
    }
  }
});
```

#### Option C: Using Supabase Edge Function
See [PUSH_NOTIFICATION_GUIDE.md](PUSH_NOTIFICATION_GUIDE.md) for complete backend integration examples.

### 5. Test Deep Linking
Send a notification with task data:
```json
{
  "notification": {
    "title": "Task Reminder",
    "body": "Assignment due today!"
  },
  "data": {
    "taskId": "your-task-id",
    "page": "upcoming"
  }
}
```

Tapping the notification should:
- Open the app (if closed)
- Navigate to the Upcoming page
- Highlight the specific task

## Troubleshooting

### Issue: Permission Denied
**Solution**: Manually grant permission in Android Settings:
- Settings → Apps → NestTask → Notifications → Allow

### Issue: No Token Generated
**Check**:
1. Device has Google Play Services
2. Internet connection is active
3. Check logcat: `adb logcat | grep -i "push\|fcm\|firebase"`

### Issue: Token Not Saved to Database
**Check**:
1. User is logged in
2. Network connection is active
3. Supabase credentials are correct in `.env.production`
4. RLS policies allow insert for authenticated users

### Issue: Notification Not Received
**Check**:
1. Token is active in database
2. App is not in battery optimization mode
3. Firebase project has correct sender ID
4. Backend is sending to correct token

## Files Modified
- [android/app/build.gradle](android/app/build.gradle) - Added Firebase dependencies

## Files Already Configured (No Changes Needed)
- [android/build.gradle](android/build.gradle) - Google services classpath
- [android/app/google-services.json](android/app/google-services.json) - Firebase config
- [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml) - Permissions & metadata
- [capacitor.config.ts](capacitor.config.ts) - Push plugin config
- [src/hooks/usePushNotifications.ts](src/hooks/usePushNotifications.ts) - Registration logic
- [src/App.tsx](src/App.tsx) - Auto-registration on login
- [supabase/migrations/20251229_fcm_tokens.sql](supabase/migrations/20251229_fcm_tokens.sql) - Database schema

## Next Steps

1. **Install the new APK** on your device
2. **Log in** and check if registration succeeds
3. **Copy the FCM token** from Supabase `fcm_tokens` table
4. **Send a test notification** using Firebase Console
5. **Verify** the notification appears on your device

## Additional Resources
- [Push Notification Guide](PUSH_NOTIFICATION_GUIDE.md) - Deep linking & backend integration
- [Firebase Console](https://console.firebase.google.com/project/nesttask-73c13)
- [Supabase Dashboard](https://nglfbbdoyyfslzyjarqs.supabase.co)
