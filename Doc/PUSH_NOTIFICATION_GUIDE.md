# Push Notification Deep Linking Guide

## Overview
The push notification system now supports deep linking that redirects users to specific pages or content when they tap on a notification.

## How It Works

### 1. Notification Click Handling
When a user taps a push notification, the app:
- Opens the app (if closed)
- Brings the app to foreground (if in background)
- Navigates to the specified page or content
- Optionally highlights specific tasks or announcements

### 2. Supported Navigation Types

#### Navigate to a Specific Task
Send a notification with `taskId` in the data payload:

```json
{
  "notification": {
    "title": "Task Reminder",
    "body": "Your assignment is due today!"
  },
  "data": {
    "taskId": "123e4567-e89b-12d3-a456-426614174000",
    "page": "home"
  }
}
```

#### Navigate to a Specific Page
Send a notification with `page` in the data payload:

```json
{
  "notification": {
    "title": "New Lecture Slides Available",
    "body": "Check out the latest materials"
  },
  "data": {
    "page": "lecture-slides"
  }
}
```

Available pages:
- `home` - Home page with task list
- `upcoming` - Upcoming tasks view
- `search` - Search page
- `lecture-slides` - Lecture slides page

#### Navigate to an Announcement
Send a notification with `announcementId`:

```json
{
  "notification": {
    "title": "New Announcement",
    "body": "Important update from admin"
  },
  "data": {
    "announcementId": "announcement-123",
    "page": "home"
  }
}
```

#### Default Behavior
If no data is provided, the app opens to the home page:

```json
{
  "notification": {
    "title": "Welcome Back!",
    "body": "You have pending tasks"
  },
  "data": {}
}
```

## Implementation Details

### Backend Integration
To send push notifications with proper redirection, use the FCM API:

```javascript
const admin = require('firebase-admin');

// Send task reminder
await admin.messaging().send({
  token: userFCMToken,
  notification: {
    title: 'Task Reminder',
    body: 'Your assignment is due today!'
  },
  data: {
    taskId: task.id,
    page: 'home',
    clickAction: 'FLUTTER_NOTIFICATION_CLICK' // Optional
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'task_reminders'
    }
  }
});
```

### Using Supabase Edge Functions
Example function to send notifications:

```typescript
import { createClient } from '@supabase/supabase-js'

const sendPushNotification = async (userId: string, notification: any) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Get user's FCM token
  const { data: tokens } = await supabase
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true)
  
  if (!tokens?.length) return
  
  // Send to each token
  for (const { token } of tokens) {
    await fetch('https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        message: {
          token,
          notification: notification.notification,
          data: notification.data,
          android: {
            priority: 'high'
          }
        }
      })
    })
  }
}
```

## Testing Push Notifications

### 1. Test on Android Device
```bash
npm run android:build
npm run android:open
```

### 2. Send Test Notification via Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification details
4. Add custom data:
   - Key: `taskId`, Value: `your-task-id`
   - Key: `page`, Value: `home`
5. Select your app and send

### 3. Test via FCM REST API
```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": {
        "title": "Test Notification",
        "body": "Tap to open task"
      },
      "data": {
        "taskId": "123",
        "page": "home"
      }
    }
  }'
```

## Configuration Files Updated

### 1. `usePushNotifications.ts`
- Enhanced `pushNotificationActionPerformed` listener
- Supports multiple navigation types (task, page, announcement)
- Emits `push-notification-action` custom event

### 2. `App.tsx`
- Added event listener for `push-notification-action`
- Automatically navigates to specified page
- Handles taskId and announcementId parameters

### 3. `capacitor.config.ts`
- Added deep linking configuration
- Configured intent filters for `nesttask://app` scheme

### 4. `AndroidManifest.xml`
- Added deep link intent filter to MainActivity
- Configured for `nesttask://app` URL scheme
- Set `launchMode="singleTask"` to reuse existing activity

## Deep Link URL Format

The app responds to these URL formats:

- `nesttask://app` - Opens app to home
- `nesttask://app?taskId=123` - Opens app and navigates to task
- `nesttask://app?page=lecture-slides` - Opens app to lecture slides page

## Notification Channels (Android)

For better notification management, consider creating notification channels:

```kotlin
// In MainActivity.onCreate() or a custom plugin
val channel = NotificationChannel(
    "task_reminders",
    "Task Reminders",
    NotificationManager.IMPORTANCE_HIGH
).apply {
    description = "Notifications for task reminders and deadlines"
    enableLights(true)
    lightColor = Color.BLUE
    enableVibration(true)
}

val notificationManager = getSystemService(NotificationManager::class.java)
notificationManager.createNotificationChannel(channel)
```

## Troubleshooting

### Notification doesn't navigate
- Check browser console for "Handling push notification action" log
- Verify the `data` object contains valid page name
- Ensure the notification has data payload (not just notification)

### App doesn't open on notification tap
- Verify AndroidManifest.xml has the intent-filter
- Check that `launchMode="singleTask"` is set
- Rebuild and sync: `npm run android:build`

### Token not saving
- Check database permissions for `fcm_tokens` table
- Verify user is logged in when registering
- Check console for "FCM token saved successfully" message

## Database Schema

Ensure your `fcm_tokens` table has this structure:

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_active ON fcm_tokens(is_active);
```

## Next Steps

1. **Test on physical device** - Push notifications work best on real devices
2. **Set up notification server** - Create backend service to send notifications
3. **Configure Firebase** - Add your app to Firebase and download google-services.json
4. **Create notification triggers** - Set up automated notifications for task reminders
5. **Analytics** - Track notification open rates and engagement

## Example Notification Scenarios

### Task Due Soon
```json
{
  "notification": {
    "title": "📝 Task Due Soon",
    "body": "Your assignment is due in 1 hour!"
  },
  "data": {
    "taskId": "task-uuid",
    "page": "home",
    "priority": "high"
  }
}
```

### New Lecture Slides
```json
{
  "notification": {
    "title": "📚 New Study Material",
    "body": "Lecture slides for Chapter 5 are now available"
  },
  "data": {
    "page": "lecture-slides",
    "slideId": "slide-uuid"
  }
}
```

### Admin Announcement
```json
{
  "notification": {
    "title": "📢 Important Announcement",
    "body": "Class schedule has been updated"
  },
  "data": {
    "announcementId": "announcement-uuid",
    "page": "home"
  }
}
```
