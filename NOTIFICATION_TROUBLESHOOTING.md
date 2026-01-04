# Push Notification Troubleshooting Guide

## Issue: Notification doesn't open the app when clicked

### ✅ What We Fixed

1. **Added Notification Channels** - Created proper notification channels in MainActivity.java for Android 8.0+
2. **Configured Deep Linking** - Set up intent filters in AndroidManifest.xml
3. **Added Click Handlers** - Implemented proper event listeners in App.tsx

### 🔍 Common Issues & Solutions

#### Issue 1: Notification appears but clicking does nothing

**Cause:** The notification might not be sent with the correct FCM payload format.

**Solution:** Ensure your FCM notification has both `notification` AND `data` objects:

```json
{
  "message": {
    "token": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Task Reminder",
      "body": "Your assignment is due soon!"
    },
    "data": {
      "taskId": "123",
      "page": "home"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "task_reminders",
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        "sound": "default"
      }
    }
  }
}
```

**Key points:**
- ✅ Include `android.priority: "high"` for immediate delivery
- ✅ Use `android.notification.channel_id` matching one of: `default`, `task_reminders`, or `announcements`
- ✅ Add `click_action: "FLUTTER_NOTIFICATION_CLICK"` (works for Capacitor too)

#### Issue 2: App doesn't open when tapped (background/killed state)

**Cause:** Android might be blocking the app from opening automatically.

**Solution:**

1. **Check App Battery Optimization:**
   ```
   Settings > Apps > NestTask > Battery > Unrestricted
   ```

2. **Check Autostart Permissions (Xiaomi, Oppo, Vivo):**
   ```
   Settings > Apps > NestTask > Autostart > Enable
   ```

3. **Check Background Activity:**
   ```
   Settings > Apps > NestTask > Battery > Allow background activity
   ```

#### Issue 3: Notifications don't appear at all

**Solution:**

1. **Verify Firebase Configuration:**
   - Check that `google-services.json` is in `android/app/`
   - Verify the package name matches: `com.nesttask.app`

2. **Check Notification Permissions:**
   ```kotlin
   // In Android 13+, notifications require runtime permission
   POST_NOTIFICATIONS permission must be granted
   ```

3. **Verify FCM Token Registration:**
   - Check browser console for: "Push registration success"
   - Verify token is saved in `fcm_tokens` table

#### Issue 4: Notification opens app but doesn't navigate to correct page

**Cause:** Event listener might not be catching the action.

**Solution:**

1. **Check Browser Console** (in Android Studio Logcat or Chrome DevTools):
   ```
   Look for: "Handling push notification action"
   ```

2. **Verify notification data structure:**
   ```json
   {
     "data": {
       "page": "home",        // Must be valid page name
       "taskId": "uuid",      // Optional
       "announcementId": "id" // Optional
     }
   }
   ```

3. **Valid page values:**
   - `home` ✅
   - `upcoming` ✅
   - `search` ✅
   - `lecture-slides` ✅

### 📱 Testing Steps

#### Step 1: Verify App Installation
```bash
# Rebuild and install fresh
npm run android:build
npm run android:open

# In Android Studio:
# 1. Click "Run" (green play button)
# 2. Select your device
# 3. Wait for installation
```

#### Step 2: Grant Permissions
On your Android device:
1. Open the app
2. Allow notification permissions when prompted
3. Check Settings > Apps > NestTask > Notifications are enabled

#### Step 3: Send Test Notification

**Option A: Using Firebase Console**
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Fill in:
   - **Notification title:** "Test Notification"
   - **Notification text:** "Tap to open app"
4. Click "Next" > Select your app
5. Click "Additional options"
6. Add custom data:
   - Key: `page` | Value: `home`
   - Key: `taskId` | Value: `test-123`
7. Send now

**Option B: Using cURL (Recommended)**
```bash
# Get your FCM server key from Firebase Console > Project Settings > Cloud Messaging

curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "Click to open app"
    },
    "data": {
      "page": "home",
      "taskId": "test-123"
    },
    "priority": "high",
    "android": {
      "notification": {
        "channel_id": "task_reminders",
        "click_action": "FLUTTER_NOTIFICATION_CLICK"
      }
    }
  }'
```

**Option C: Using Postman**
1. Method: POST
2. URL: `https://fcm.googleapis.com/fcm/send`
3. Headers:
   - `Authorization: key=YOUR_SERVER_KEY`
   - `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "to": "DEVICE_FCM_TOKEN",
  "notification": {
    "title": "Test Notification",
    "body": "Click me!"
  },
  "data": {
    "page": "home"
  },
  "priority": "high"
}
```

#### Step 4: Test Different States

1. **App in Foreground:**
   - Notification should appear as a heads-up
   - Tapping should navigate within app

2. **App in Background:**
   - Pull notification shade
   - Tap notification
   - App should come to foreground and navigate

3. **App Killed:**
   - Force stop the app
   - Send notification
   - Tap notification
   - App should start and navigate to correct page

### 🐛 Debug Logging

#### Enable Android Debug Logging

1. **Connect device via USB**
2. **Enable USB Debugging** on device
3. **Run in Android Studio:**
   ```bash
   npm run android:open
   ```

4. **View Logcat:**
   - In Android Studio: View > Tool Windows > Logcat
   - Filter by: `com.nesttask.app`

5. **Look for these logs:**
   ```
   Push registration success, token: xxx
   Push notification received: {...}
   Push notification action performed: {...}
   Handling push notification action: {...}
   ```

#### Enable Browser Console Logging

1. **In Android Studio**, with app running:
2. Click the browser icon in Logcat
3. Or use Chrome DevTools:
   - Open Chrome
   - Go to: `chrome://inspect`
   - Select your device
   - Click "Inspect"

### 🔧 Advanced Fixes

#### Fix 1: Clear App Data and Reinstall
```bash
# Uninstall completely
adb uninstall com.nesttask.app

# Reinstall
npm run android:build
npm run android:open
```

#### Fix 2: Verify Google Services Plugin
Check `android/app/build.gradle` has at bottom:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### Fix 3: Update FCM Dependencies
Edit `android/build.gradle`:
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.4'  // Latest version
}
```

#### Fix 4: Enable Notification Logs
Add to `MainActivity.java`:
```java
import android.util.Log;

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    Log.d("MainActivity", "App started with intent: " + getIntent().getAction());
    
    if (getIntent().getExtras() != null) {
        for (String key : getIntent().getExtras().keySet()) {
            Log.d("MainActivity", "Extra: " + key + " = " + getIntent().getExtras().get(key));
        }
    }
    
    createNotificationChannels();
}
```

### 📋 Checklist

Before reporting issues, verify:

- [ ] `google-services.json` exists in `android/app/`
- [ ] App has notification permission granted
- [ ] Device isn't in battery saver mode
- [ ] App can run in background (check battery settings)
- [ ] FCM token is successfully saved to database
- [ ] Notification includes both `notification` and `data` objects
- [ ] `channel_id` matches one of the created channels
- [ ] Android version is 5.0 (API 21) or higher
- [ ] App is installed from Android Studio (not production build)

### 🚀 Production Checklist

For production deployments:

1. **Create signed APK/AAB**
2. **Update Firebase with production SHA-256**
3. **Test on multiple Android versions** (8, 9, 10, 11, 12, 13, 14)
4. **Test on different manufacturers** (Samsung, Xiaomi, Oppo, etc.)
5. **Configure notification icons** (white icon for Android)
6. **Test deep linking** with actual URLs
7. **Monitor FCM delivery reports** in Firebase Console

### 💡 Best Practices

1. **Always include data payload** - Even if you just want to open the app
2. **Use high priority** - For time-sensitive notifications
3. **Set appropriate channel** - Match notification importance
4. **Test on real devices** - Emulators have limited FCM support
5. **Handle all app states** - Foreground, background, killed
6. **Graceful fallbacks** - If page doesn't exist, go to home

### 📞 Still Having Issues?

If notification still doesn't work after all above:

1. **Check Android version:**
   ```bash
   adb shell getprop ro.build.version.release
   ```

2. **Verify device FCM support:**
   - Must have Google Play Services
   - Check: Settings > Apps > Google Play Services

3. **Test with a different device** - Some manufacturers heavily restrict background apps

4. **Check Firebase Console logs** - Cloud Messaging > Reports

### 🎯 Quick Fix Summary

**Most common solution:**
```json
// Send notification like this:
{
  "to": "DEVICE_TOKEN",
  "priority": "high",
  "notification": {
    "title": "Title",
    "body": "Body"
  },
  "data": {
    "page": "home",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  },
  "android": {
    "notification": {
      "channel_id": "task_reminders"
    }
  }
}
```

**And ensure on device:**
- Notifications enabled for app
- Battery optimization disabled
- Background activity allowed

---

**After making any changes, always:**
```bash
npm run android:build
```

Then test on a **real device** with **USB debugging** enabled to see logs!
