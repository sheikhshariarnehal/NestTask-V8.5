package com.nesttask.app;

import android.os.Bundle;
import android.content.Intent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Performance: Set hardware acceleration before super.onCreate
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        
        super.onCreate(savedInstanceState);
        
        // Optimize WebView for performance
        optimizeWebView();
        
        // Create notification channels for Android 8.0+
        createNotificationChannels();
        
        // Handle notification click intent
        handleNotificationIntent(getIntent());
    }
    
    /**
     * Optimize WebView settings for faster loading and better performance
     */
    private void optimizeWebView() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView == null) return;
            
            WebSettings settings = webView.getSettings();
            
            // Disable autofill to prevent NullPointerException in Chrome WebView
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }
            
            // Performance: Enable hardware acceleration for WebView
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
            
            // Cache settings for faster loading
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            // JavaScript optimizations
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            
            // Render performance
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setEnableSmoothTransition(true);
            
            // Disable unnecessary features for performance
            settings.setGeolocationEnabled(false);
            settings.setSaveFormData(false);
            settings.setSavePassword(false);
            
            // Media settings
            settings.setMediaPlaybackRequiresUserGesture(true);
            
            // Viewport settings for consistent rendering
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            
            // Text encoding
            settings.setDefaultTextEncodingName("UTF-8");
            
            android.util.Log.d("MainActivity", "WebView optimizations applied successfully");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Failed to optimize WebView: " + e.getMessage());
        }
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
