/**
 * Push Navigation Service
 * Handles push notification navigation for both:
 * 1. App opened from background (onNotificationOpenedApp equivalent)
 * 2. App opened from killed/quit state (getInitialNotification equivalent)
 * 
 * This service must be initialized EARLY in the app lifecycle (before React renders)
 * to catch notifications that launched the app from a killed state.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

// Store pending navigation route (for when app is launched from killed state)
let pendingNavigationRoute: string | null = null;
let pendingOpenTaskId: string | null = null;
let isInitialized = false;
let listenerCleanup: (() => void)[] = [];

/**
 * Get and clear the pending navigation route
 * Called by App.tsx on mount to handle initial navigation
 */
export function getPendingNavigation(): string | null {
  const route = pendingNavigationRoute;
  pendingNavigationRoute = null; // Clear after reading
  return route;
}

/**
 * Check if there's a pending navigation
 */
export function hasPendingNavigation(): boolean {
  return pendingNavigationRoute !== null;
}

/**
 * Get and clear the pending taskId to open (from killed state)
 */
export function getPendingOpenTaskId(): string | null {
  const taskId = pendingOpenTaskId;
  pendingOpenTaskId = null;
  return taskId;
}

/**
 * Check if there's a pending taskId to open
 */
export function hasPendingOpenTaskId(): boolean {
  return pendingOpenTaskId !== null;
}

/**
 * Extract route from notification data
 */
function extractRouteFromNotification(data: any): string | null {
  if (!data) return null;
  
  console.log('[PushNav] Extracting route from data:', JSON.stringify(data));
  
  // Try to get route directly
  if (data.route && typeof data.route === 'string') {
    return data.route;
  }
  
  return null;
}

/**
 * Handle notification action (user tapped notification)
 */
function handleNotificationAction(action: ActionPerformed): void {
  console.log('[PushNav] ====== NOTIFICATION ACTION PERFORMED ======');
  console.log('[PushNav] Action ID:', action.actionId);
  console.log('[PushNav] Full action object:', JSON.stringify(action, null, 2));
  console.log('[PushNav] Notification:', JSON.stringify(action.notification, null, 2));
  console.log('[PushNav] Notification data:', JSON.stringify(action.notification?.data, null, 2));
  
  const data = action.notification?.data;
  const taskId = data?.taskId;
  const route = extractRouteFromNotification(data);
  
  console.log('[PushNav] Extracted route:', route);

  // Preferred behavior for task notifications: open task details inside Upcoming view.
  if (taskId && typeof taskId === 'string') {
    console.log('[PushNav] TaskId found:', taskId);

    // ALWAYS store the pending taskId as a backup
    pendingOpenTaskId = taskId;
    console.log('[PushNav] Stored pending taskId:', taskId);

    // Also dispatch event immediately (for warm app)
    window.dispatchEvent(
      new CustomEvent('open-task-from-notification', {
        detail: {
          taskId,
          data,
          actionId: action.actionId,
          notification: action.notification,
        },
      })
    );

    // Dispatch again after a delay to ensure React listener is ready
    setTimeout(() => {
      console.log('[PushNav] Dispatching delayed event (500ms) for taskId:', taskId);
      window.dispatchEvent(
        new CustomEvent('open-task-from-notification', {
          detail: {
            taskId,
            data,
            actionId: action.actionId,
            notification: action.notification,
          },
        })
      );
    }, 500);

    // Dispatch again after a longer delay for slower devices
    setTimeout(() => {
      console.log('[PushNav] Dispatching delayed event (1500ms) for taskId:', taskId);
      window.dispatchEvent(
        new CustomEvent('open-task-from-notification', {
          detail: {
            taskId,
            data,
            actionId: action.actionId,
            notification: action.notification,
          },
        })
      );
    }, 1500);

    return;
  }
  
  if (route) {
    // Check if React app is ready (has rendered)
    const rootElement = document.getElementById('root');
    const isAppReady = rootElement && rootElement.children.length > 0;
    
    console.log('[PushNav] App ready:', isAppReady);
    
    if (isAppReady) {
      // App is ready, navigate immediately
      console.log('[PushNav] App ready, navigating to:', route);
      setTimeout(() => {
        window.location.href = route;
      }, 150);
    } else {
      // App not ready yet (launched from killed state)
      // Store route for later navigation
      console.log('[PushNav] App not ready, storing pending route:', route);
      pendingNavigationRoute = route;
    }
  } else {
    console.log('[PushNav] No route extracted from notification data');
  }
}

/**
 * Handle notification received (app in foreground)
 */
function handleNotificationReceived(notification: PushNotificationSchema): void {
  console.log('[PushNav] ====== NOTIFICATION RECEIVED (FOREGROUND) ======');
  console.log('[PushNav] Notification:', JSON.stringify(notification, null, 2));
  console.log('[PushNav] Notification data:', JSON.stringify(notification.data, null, 2));
}

/**
 * Initialize push notification listeners
 * Should be called ONCE at app startup, before React renders
 */
export async function initPushNotificationListeners(): Promise<void> {
  if (isInitialized) {
    console.log('[PushNav] Already initialized, skipping');
    return;
  }
  
  if (!Capacitor.isNativePlatform()) {
    console.log('[PushNav] Not a native platform, skipping');
    return;
  }
  
  console.log('[PushNav] ====== INITIALIZING PUSH LISTENERS ======');
  console.log('[PushNav] Platform:', Capacitor.getPlatform());
  
  try {
    // Set up listener for notification taps (equivalent to onNotificationOpenedApp)
    const actionListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      handleNotificationAction
    );
    listenerCleanup.push(() => actionListener.remove());
    console.log('[PushNav] Action listener registered');
    
    // Set up listener for notifications received in foreground
    const receivedListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      handleNotificationReceived
    );
    listenerCleanup.push(() => receivedListener.remove());
    console.log('[PushNav] Received listener registered');
    
    isInitialized = true;
    console.log('[PushNav] Push notification listeners initialized successfully');
    
  } catch (error) {
    console.error('[PushNav] Error initializing push listeners:', error);
  }
}

/**
 * Cleanup listeners (call on app unmount if needed)
 */
export function cleanupPushNotificationListeners(): void {
  listenerCleanup.forEach(cleanup => cleanup());
  listenerCleanup = [];
  isInitialized = false;
}

/**
 * Manually trigger navigation check
 * Can be called from App.tsx useEffect to handle pending navigation
 */
export function checkAndNavigate(): void {
  console.log('[PushNav] Checking for pending navigation...');
  const taskId = getPendingOpenTaskId();
  if (taskId) {
    console.log('[PushNav] Emitting pending task open for:', taskId);
    window.dispatchEvent(
      new CustomEvent('open-task-from-notification', {
        detail: { taskId },
      })
    );
    return;
  }

  const route = getPendingNavigation();
  if (route) {
    console.log('[PushNav] Executing pending navigation to:', route);
    setTimeout(() => {
      window.location.href = route;
    }, 150);
  } else {
    console.log('[PushNav] No pending navigation');
  }
}
