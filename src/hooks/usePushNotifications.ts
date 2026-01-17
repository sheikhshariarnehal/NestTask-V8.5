import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
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

const DEFAULT_STATE: PushNotificationState = {
  isSupported: false,
  isRegistered: false,
  permissionStatus: 'unknown',
  token: null,
  error: null,
  loading: true
};

let sharedState: PushNotificationState = { ...DEFAULT_STATE };
const subscribers = new Set<(next: PushNotificationState) => void>();

let latestUserId: string | null = null;
let isInitStarted = false;
let isChannelCreated = false;
let registerInFlight: Promise<boolean> | null = null;
let lastSavedToken: { userId: string; token: string; savedAt: number } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (isRecord(error)) {
    const maybeMessage = error.message;
    const maybeError = error.error;
    if (typeof maybeError === 'string') return maybeError;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return String(error);
}

function publish(next: PushNotificationState) {
  sharedState = next;
  for (const notify of subscribers) {
    notify(sharedState);
  }
}

function updateSharedState(updater: (prev: PushNotificationState) => PushNotificationState) {
  publish(updater(sharedState));
}

function redactToken(token: string) {
  const suffix = token.slice(-6);
  return `***${suffix}`;
}

function formatSupabaseError(error: unknown) {
  if (!isRecord(error)) {
    return String(error);
  }

  const message = typeof error.message === 'string' ? error.message : safeStringify(error);
  const details = typeof error.details === 'string' ? error.details : undefined;
  const hint = typeof error.hint === 'string' ? error.hint : undefined;
  const code = typeof error.code === 'string' ? error.code : undefined;

  return [message, details && `details=${details}`, hint && `hint=${hint}`, code && `code=${code}`]
    .filter(Boolean)
    .join(' | ');
}

async function upsertFcmToken(userId: string, token: string) {
  const now = Date.now();
  if (lastSavedToken && lastSavedToken.userId === userId && lastSavedToken.token === token && now - lastSavedToken.savedAt < 2 * 60 * 1000) {
    console.log('[FCM] ✔️ Token already saved recently, skipping');
    return;
  }

  console.log('[FCM] 📦 Starting token upsert');
  console.log('[FCM]   User ID:', userId);
  console.log('[FCM]   Token preview:', token.substring(0, 30) + '...');
  console.log('[FCM]   Platform:', Capacitor.getPlatform());

  const deviceInfo: DeviceInfo = {
    platform: Capacitor.getPlatform(),
    model: 'unknown',
    osVersion: 'unknown',
    appVersion: '1.0.0'
  };

  const tokenData = {
    user_id: userId,
    token,
    platform: Capacitor.getPlatform() as 'android' | 'ios' | 'web',
    device_info: deviceInfo,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  console.log('[FCM] 💾 Upserting token to database...');

  const { data, error } = await supabase
    .from('fcm_tokens')
    .upsert(tokenData, {
      onConflict: 'token',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('[FCM] ❌ Upsert FAILED');
    console.error('[FCM]   Error message:', error.message);
    console.error('[FCM]   Error code:', error.code);
    console.error('[FCM]   Error details:', error.details);
    console.error('[FCM]   Error hint:', error.hint);
    throw error;
  }

  console.log('[FCM] ✅ Token saved successfully!');
  console.log('[FCM]   Records affected:', data?.length || 0);
  if (import.meta.env.DEV && data && data.length > 0) {
    console.log('[FCM]   Saved record ID:', data[0].id);
  }
  lastSavedToken = { userId, token, savedAt: now };
}

async function deactivateFcmToken(userId: string, token: string) {
  const { error } = await supabase
    .from('fcm_tokens')
    .update({ is_active: false })
    .eq('token', token)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function ensureInitialized(isNativePlatform: boolean) {
  if (isInitStarted) return;
  isInitStarted = true;

  if (!isNativePlatform) {
    publish({
      ...DEFAULT_STATE,
      isSupported: false,
      loading: false,
      error: 'Push notifications are only supported on native platforms'
    });
    return;
  }

  // Attach listeners once; broadcast updates to all hook instances via shared state.
  PushNotifications.addListener('registration', async (token: Token) => {
    const tokenValue = token?.value;
    if (!tokenValue) {
      console.error('[FCM] Registration event received but token is empty');
      return;
    }

    console.log('[FCM] ✅ Push registration success');
    if (import.meta.env.DEV) {
      console.log('[FCM] Token preview:', redactToken(tokenValue));
    }

    updateSharedState(prev => ({
      ...prev,
      isRegistered: true,
      token: tokenValue,
      loading: false,
      error: null
    }));

    if (!latestUserId) {
      console.warn('[FCM] ⚠️ No user logged in, token not saved yet');
      return;
    }

    try {
      console.log('[FCM] Saving token to database for user:', latestUserId);
      await upsertFcmToken(latestUserId, tokenValue);
      console.log('[FCM] ✅ Token saved successfully');
    } catch (error) {
      const formatted = formatSupabaseError(error);
      console.error('[FCM] ❌ Failed to save FCM token:', formatted);
      updateSharedState(prev => ({ ...prev, error: formatted }));
    }
  });

  PushNotifications.addListener('registrationError', (error: unknown) => {
    const message = toErrorMessage(error);
    console.error('Push registration error:', message);
    updateSharedState(prev => ({
      ...prev,
      isRegistered: false,
      loading: false,
      error: message || 'Registration failed'
    }));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    if (import.meta.env.DEV) {
      console.log('Push notification received:', notification);
    }
  });

  // Populate initial permission status once.
  try {
    const permStatus = await PushNotifications.checkPermissions();
    updateSharedState(prev => ({
      ...prev,
      isSupported: true,
      permissionStatus: permStatus.receive,
      loading: false
    }));
  } catch (error) {
    console.error('Error checking push permissions:', String(error));
    updateSharedState(prev => ({ ...prev, loading: false }));
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>(sharedState);

  // Check if push notifications are supported
  const isNativePlatform = Capacitor.isNativePlatform();

  // Register for push notifications
  const register = useCallback(async () => {
    if (!isNativePlatform) {
      updateSharedState(prev => ({
        ...prev,
        isSupported: false,
        loading: false,
        error: 'Push notifications are only supported on native platforms'
      }));
      return Promise.resolve(false);
    }

    if (registerInFlight) {
      return registerInFlight;
    }

    registerInFlight = (async () => {
      try {
        updateSharedState(prev => ({ ...prev, loading: true, error: null }));

        // Create notification channel for Android
        if (Capacitor.getPlatform() === 'android' && !isChannelCreated) {
          await PushNotifications.createChannel({
            id: 'tasks',
            name: 'Task Notifications',
            description: 'Notifications for new tasks and updates',
            importance: 4,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#3b82f6'
          });
          isChannelCreated = true;
          if (import.meta.env.DEV) {
            console.log('Created notification channel: tasks');
          }
        }

        // Check current permission status
        let permStatus = await PushNotifications.checkPermissions();

        // Request permission if not determined
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          updateSharedState(prev => ({
            ...prev,
            permissionStatus: permStatus.receive as 'denied' | 'prompt',
            loading: false,
            error: 'Push notification permission denied'
          }));
          return false;
        }

        // Register with FCM
        await PushNotifications.register();

        updateSharedState(prev => ({
          ...prev,
          isSupported: true,
          permissionStatus: 'granted',
          loading: false
        }));

        return true;
      } catch (error: unknown) {
        const message = toErrorMessage(error);
        console.error('Push registration error:', message);
        updateSharedState(prev => ({
          ...prev,
          loading: false,
          error: message || 'Failed to register for push notifications'
        }));
        return false;
      } finally {
        registerInFlight = null;
      }
    })();

    return registerInFlight;
  }, [isNativePlatform]);

  // Unregister from push notifications
  const unregister = useCallback(async () => {
    if (!isNativePlatform || !state.token) return false;

    try {
      // Deactivate token in database
      if (latestUserId) {
        await deactivateFcmToken(latestUserId, state.token);
      }
      
      updateSharedState(prev => ({
        ...prev,
        isRegistered: false,
        token: null
      }));

      return true;
    } catch (error: unknown) {
      console.error('Push unregistration error:', toErrorMessage(error));
      return false;
    }
  }, [isNativePlatform, state.token]);

  // Share state across multiple hook instances (App + Settings modal).
  useEffect(() => {
    const listener = (next: PushNotificationState) => setState(next);
    subscribers.add(listener);
    setState(sharedState);

    return () => {
      subscribers.delete(listener);
    };
  }, []);

  // Keep the latest user id available for the shared registration listener.
  useEffect(() => {
    const previousUserId = latestUserId;
    latestUserId = user?.id ?? null;
    
    // If user just logged in and we have a token, save it immediately
    if (latestUserId && !previousUserId && sharedState.token) {
      console.log('[FCM] User logged in, saving existing token...');
      upsertFcmToken(latestUserId, sharedState.token)
        .then(() => {
          console.log('[FCM] ✅ Token saved for newly logged in user');
        })
        .catch((error) => {
          console.error('[FCM] ❌ Failed to save token for logged in user:', formatSupabaseError(error));
        });
    }
  }, [user?.id]);

  // Initialize once.
  useEffect(() => {
    void ensureInitialized(isNativePlatform);
  }, [isNativePlatform]);

  return {
    ...state,
    register,
    unregister,
    isNativePlatform
  };
}
