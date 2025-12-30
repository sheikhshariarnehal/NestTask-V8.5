import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  token: string | null;
  error: string | null;
  loading: boolean;
}

interface DeviceInfo {
  platform: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    permissionStatus: 'unknown',
    token: null,
    error: null,
    loading: true
  });

  // Check if push notifications are supported
  const isNativePlatform = Capacitor.isNativePlatform();

  // Save FCM token to Supabase
  const saveFCMToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      const deviceInfo: DeviceInfo = {
        platform: Capacitor.getPlatform(),
        model: undefined,
        osVersion: undefined
      };

      // Upsert token (insert or update if exists)
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: Capacitor.getPlatform() as 'android' | 'ios' | 'web',
          device_info: deviceInfo,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('Error saving FCM token:', error);
        throw error;
      }

      console.log('FCM token saved successfully');
    } catch (error: any) {
      console.error('Failed to save FCM token:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [user?.id]);

  // Remove FCM token from Supabase
  const removeFCMToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('token', token)
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('FCM token deactivated');
    } catch (error: any) {
      console.error('Failed to remove FCM token:', error);
    }
  }, [user?.id]);

  // Register for push notifications
  const register = useCallback(async () => {
    if (!isNativePlatform) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false, 
        loading: false,
        error: 'Push notifications are only supported on native platforms'
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Create notification channel for Android (clean, optimized styling)
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'tasks',
          name: 'Task Notifications',
          description: 'Notifications for new tasks and updates',
          importance: 4, // High importance
          visibility: 1, // Public
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#3b82f6', // Blue color
        });
        console.log('Created notification channel: tasks');
      }

      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      
      // Request permission if not determined
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          permissionStatus: permStatus.receive as 'denied' | 'prompt',
          loading: false,
          error: 'Push notification permission denied'
        }));
        return false;
      }

      // Register with FCM
      await PushNotifications.register();

      setState(prev => ({ 
        ...prev, 
        isSupported: true,
        permissionStatus: 'granted',
        loading: false 
      }));

      return true;
    } catch (error: any) {
      console.error('Push registration error:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Failed to register for push notifications'
      }));
      return false;
    }
  }, [isNativePlatform]);

  // Unregister from push notifications
  const unregister = useCallback(async () => {
    if (!isNativePlatform || !state.token) return false;

    try {
      // Deactivate token in database
      await removeFCMToken(state.token);
      
      setState(prev => ({ 
        ...prev, 
        isRegistered: false, 
        token: null 
      }));

      return true;
    } catch (error: any) {
      console.error('Push unregistration error:', error);
      return false;
    }
  }, [isNativePlatform, state.token, removeFCMToken]);

  // Initialize push notification listeners
  useEffect(() => {
    if (!isNativePlatform) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    // Set up event listeners
    const registrationListener = PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setState(prev => ({ 
          ...prev, 
          isRegistered: true, 
          token: token.value,
          loading: false 
        }));
        
        // Save token to database
        await saveFCMToken(token.value);
      }
    );

    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error: any) => {
        console.error('Push registration error:', error);
        setState(prev => ({ 
          ...prev, 
          isRegistered: false, 
          loading: false,
          error: error.error || 'Registration failed'
        }));
      }
    );

    // Handle push received when app is in foreground
    const pushReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // The notification will be shown automatically based on presentationOptions
        // You can also handle in-app display here if needed
      }
    );

    // Handle push notification action (user tapped notification)
    const pushActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed');
        console.log('Action:', action.actionId);
        console.log('Notification data:', action.notification);
        
        // Dispatch event to notify the app
        window.dispatchEvent(new CustomEvent('push-notification-clicked', { 
          detail: { 
            opened: true,
            actionId: action.actionId,
            data: action.notification.data,
            notification: action.notification
          } 
        }));
        
        // If the app was in background, this will bring it to foreground
        // The event listener in App.tsx can handle any navigation if needed
      }
    );

    // Check initial status
    const checkInitialStatus = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();
        setState(prev => ({ 
          ...prev, 
          isSupported: true,
          permissionStatus: permStatus.receive as any,
          loading: false
        }));

        // Auto-register if permission already granted
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }
      } catch (error) {
        console.error('Error checking push permissions:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    checkInitialStatus();

    // Cleanup listeners
    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      pushReceivedListener.then(l => l.remove());
      pushActionListener.then(l => l.remove());
    };
  }, [isNativePlatform, saveFCMToken]);

  // Re-register when user changes
  useEffect(() => {
    if (user?.id && isNativePlatform && state.permissionStatus === 'granted') {
      register();
    }
  }, [user?.id, isNativePlatform, state.permissionStatus, register]);

  return {
    ...state,
    register,
    unregister,
    isNativePlatform
  };
}
