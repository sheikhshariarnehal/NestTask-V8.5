package com.nesttask.app;

import android.os.Bundle;
import android.content.Intent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Disable autofill to prevent NullPointerException in Chrome WebView
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
                }
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "Failed to disable autofill: " + e.getMessage());
            }
        }
        
        // Create notification channels for Android 8.0+
        createNotificationChannels();
        
        // Handle notification click intent
        handleNotificationIntent(getIntent());
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Handle notification click when app is already running
        handleNotificationIntent(intent);
    }
    
    private void handleNotificationIntent(Intent intent) {
        if (intent != null && intent.getExtras() != null) {
            // Check if this intent came from a notification
            Bundle extras = intent.getExtras();
            if (extras.containsKey("google.message_id") || extras.containsKey("gcm.notification.body")) {
                // This is a notification click - the Capacitor push plugin will handle the data
                // Just ensure the app is brought to foreground
                android.util.Log.d("MainActivity", "App opened from push notification");
            }
        }
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Tasks channel - must match AndroidManifest.xml default_notification_channel_id
            NotificationChannel tasksChannel = new NotificationChannel(
                "tasks",
                "Task Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            tasksChannel.setDescription("Notifications for tasks, reminders and deadlines");
            tasksChannel.enableLights(true);
            tasksChannel.enableVibration(true);
            tasksChannel.setShowBadge(true);
            
            // Default channel for general notifications
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "Default Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            defaultChannel.setDescription("General app notifications");
            defaultChannel.enableLights(true);
            defaultChannel.enableVibration(true);
            defaultChannel.setShowBadge(true);
            
            // Announcements channel
            NotificationChannel announcementChannel = new NotificationChannel(
                "announcements",
                "Announcements",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            announcementChannel.setDescription("Important announcements from admins");
            announcementChannel.enableLights(true);
            announcementChannel.setShowBadge(true);
            
            // Register channels
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(tasksChannel);
                notificationManager.createNotificationChannel(defaultChannel);
                notificationManager.createNotificationChannel(announcementChannel);
            }
        }
    }
}
