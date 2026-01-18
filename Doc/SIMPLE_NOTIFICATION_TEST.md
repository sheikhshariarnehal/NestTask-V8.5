# Simple Push Notification Test Guide

## ✅ What's Fixed

Simplified the entire notification system to **just open the app** when you tap a notification. No complex routing, no deep linking - just simple and clean.

## 🚀 Quick Test

### Step 1: Install the App
```bash
npm run android:open
```

Then in Android Studio:
1. Click the green "Run" button
2. Wait for app to install on your device
3. Grant notification permission when prompted

### Step 2: Get Your FCM Token

The app will log your FCM token to the console. To see it:

**Option A: In App** (easiest)
- Open browser console in the app (if you have debug logging)
- Look for: "Push registration success, token: ..."

**Option B: Check Database**
```sql
SELECT token FROM fcm_tokens 
WHERE user_id = 'YOUR_USER_ID' 
AND is_active = true 
ORDER BY created_at DESC 
LIMIT 1;
```

**Option C: Android Logcat**
- In Android Studio: View > Tool Windows > Logcat
- Filter by "Push registration"

### Step 3: Send Test Notification

Use this **exact** format (this is crucial):

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_DEVICE_TOKEN",
    "priority": "high",
    "notification": {
      "title": "Test Notification",
      "body": "Tap me to open the app!"
    },
    "data": {
      "message": "test"
    }
  }'
```

**Important:**
- Replace `YOUR_FCM_SERVER_KEY` with your Firebase server key
- Replace `YOUR_DEVICE_TOKEN` with the FCM token from Step 2
- You **must** include both `notification` and `data` objects
- Priority should be `"high"`

### Step 4: Test

1. **Put app in background** (press home button)
2. **Wait for notification** to appear in status bar
3. **Tap the notification**
4. **App should open** immediately

## 📱 Test All Scenarios

### ✓ App in Foreground
- Send notification
- You'll see a heads-up notification
- Tap it - app stays open

### ✓ App in Background
- Press home button
- Send notification
- Swipe down notification shade
- Tap notification
- **App should open**

### ✓ App Completely Closed
- Force stop app: Settings > Apps > NestTask > Force Stop
- Send notification
- Tap notification
- **App should launch**

## 🔑 Key Requirements for Notification

Your FCM notification **MUST** have this format:

```json
{
  "to": "DEVICE_TOKEN",
  "priority": "high",
  "notification": {
    "title": "Your Title",
    "body": "Your Message"
  },
  "data": {
    "anyKey": "anyValue"
  }
}
```

**Critical points:**
1. ✅ Must have `"priority": "high"`
2. ✅ Must have `notification` object
3. ✅ Must have `data` object (even if empty: `"data": {}`)
4. ✅ Use `"to"` for single device or `"registration_ids"` for multiple

## ⚙️ Device Settings to Check

If notification doesn't open the app:

### 1. Notification Permission
```
Settings > Apps > NestTask > Permissions > Notifications > Allow
```

### 2. Battery Optimization
```
Settings > Apps > NestTask > Battery > Unrestricted
```

### 3. Background Activity (Samsung/Xiaomi/Oppo)
```
Settings > Apps > NestTask > Battery > Allow background activity
```

### 4. Autostart (Xiaomi/Oppo/Vivo)
```
Settings > Apps > NestTask > Autostart > Enable
```

## 🐛 Still Not Working?

### Check 1: Verify google-services.json exists
```bash
ls android/app/google-services.json
```
If missing, download from Firebase Console.

### Check 2: Verify package name matches
Open `android/app/google-services.json` and check:
```json
{
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.nesttask.app"  // Must match!
      }
    }
  }]
}
```

### Check 3: Rebuild completely
```bash
# Clean build
cd android
./gradlew clean

# Go back and rebuild
cd ..
npm run android:build
```

### Check 4: Check Logcat for errors
In Android Studio:
1. Open Logcat (View > Tool Windows > Logcat)
2. Filter by "nesttask" or "Capacitor"
3. Look for any red error messages

## 📋 Quick Checklist

Before testing, ensure:

- [ ] App installed from Android Studio (not old version)
- [ ] Notification permission granted
- [ ] Battery optimization disabled
- [ ] google-services.json exists in android/app/
- [ ] Package name is `com.nesttask.app`
- [ ] FCM server key is correct
- [ ] Device token is current (not expired)
- [ ] Notification has `priority: "high"`
- [ ] Notification has both `notification` and `data` objects

## 🎯 Expected Behavior

**When you tap a notification:**
1. App opens/comes to foreground immediately
2. You see the home page
3. Console logs: "App opened from notification"

That's it! Simple and clean.

## 💡 Common Mistakes

❌ **Sending only notification without data:**
```json
{
  "notification": {
    "title": "Test"
  }
  // Missing "data" object!
}
```

❌ **Missing priority:**
```json
{
  "notification": {...}
  // Missing "priority": "high"
}
```

❌ **Using wrong token:**
- Token expired
- Token from different device
- Token from different Firebase project

✅ **Correct format:**
```json
{
  "to": "correct-token",
  "priority": "high",
  "notification": {"title": "Test", "body": "Message"},
  "data": {"message": "test"}
}
```

## 🔄 If Still Failing

1. **Uninstall app completely:**
   ```bash
   adb uninstall com.nesttask.app
   ```

2. **Reinstall fresh:**
   ```bash
   npm run android:build
   npm run android:open
   ```

3. **Get new FCM token** (old token is invalid after reinstall)

4. **Try again with new token**

## 📞 Need the FCM Server Key?

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click gear icon > Project Settings
4. Go to "Cloud Messaging" tab
5. Copy "Server key" (Legacy)

## ✨ Success Indicators

You know it's working when:
- ✅ Notification appears in status bar
- ✅ Tapping notification opens the app
- ✅ Console shows: "App opened from notification"
- ✅ Works in all states (foreground, background, killed)

---

**Remember:** The app now simply opens when you tap any notification. That's it. No complex routing, just clean and simple! 🎉
