package com.nesttask.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "=== FCM Message Received ===");
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        Log.d(TAG, "Message ID: " + remoteMessage.getMessageId());

        // Check if message contains a notification payload
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Notification Title: " + remoteMessage.getNotification().getTitle());
            Log.d(TAG, "Notification Body: " + remoteMessage.getNotification().getBody());
            sendNotification(
                remoteMessage.getNotification().getTitle(),
                remoteMessage.getNotification().getBody(),
                remoteMessage.getData()
            );
        }

        // Check if message contains a data payload
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Data payload size: " + remoteMessage.getData().size());
            Log.d(TAG, "Data payload: " + remoteMessage.getData());
            
            // If only data payload (no notification), show notification manually
            if (remoteMessage.getNotification() == null) {
                Map<String, String> data = remoteMessage.getData();
                String title = data.get("title");
                String body = data.get("body");
                
                if (title != null && body != null) {
                    Log.d(TAG, "Creating notification from data payload");
                    sendNotification(title, body, data);
                } else {
                    Log.w(TAG, "Data payload missing title or body");
                }
            }
        }
        
        Log.d(TAG, "=== Message Processing Complete ===");
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        // The Capacitor Push Notifications plugin will handle token updates
        // No need to manually send to server - the plugin does this automatically
    }

    private void sendNotification(String title, String body, Map<String, String> data) {
        Log.d(TAG, "=== Building Notification ===");
        Log.d(TAG, "Title: " + title);
        Log.d(TAG, "Body: " + body);
        
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.setAction("PUSH_NOTIFICATION_CLICK");
        
        // Add notification data to intent
        if (data != null) {
            Log.d(TAG, "Adding data to intent: " + data.size() + " items");
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
                Log.d(TAG, "  - " + entry.getKey() + ": " + entry.getValue());
            }
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            (int) System.currentTimeMillis(), // Unique request code
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Determine channel ID from data or use default
        String channelId = "tasks";
        if (data != null && data.containsKey("channel_id")) {
            channelId = data.get("channel_id");
        }
        
        Log.d(TAG, "Using channel ID: " + channelId);

        NotificationCompat.Builder notificationBuilder =
            new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                "Task Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for tasks and reminders");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created: " + channelId);
        }

        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, notificationBuilder.build());
        Log.d(TAG, "Notification displayed with ID: " + notificationId);
        Log.d(TAG, "=== Notification Complete ===");
    }
}
