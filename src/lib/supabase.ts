import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const DEFAULT_SUPABASE_REQUEST_TIMEOUT_MS = 20000;

function createTimeoutFetch(timeoutMs: number) {
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const controller = new AbortController();

    // If caller supplied a signal, propagate aborts into our controller.
    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };
}

// Export initialization error if any
export const getSupabaseInitError = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__supabaseInitError || null;
  }
  return null;
};

// Check if we're running in StackBlitz
const isStackBlitz = Boolean(
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('stackblitz.io') || 
   window.location.hostname.includes('.webcontainer.io'))
);

// Ensure environment variables are available or provide fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  (typeof window !== 'undefined' && (window as any).ENV_SUPABASE_URL);

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (typeof window !== 'undefined' && (window as any).ENV_SUPABASE_ANON_KEY);

// Store error state for later display instead of throwing immediately
let initError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  initError = 'Missing Supabase environment variables';
  console.error('⚠️ Supabase configuration error:', {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseAnonKey),
    env: import.meta.env.MODE
  });
  
  // Store error in window for early access
  if (typeof window !== 'undefined') {
    (window as any).__supabaseInitError = initError;
  }
}

// Create optimized Supabase client with retry logic and lifecycle management
// Use dummy values if env vars missing to prevent immediate crash
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'nesttask_supabase_auth',
    // Note: Session refresh is handled by useSupabaseLifecycle hook
    // We refresh proactively (5 minutes before expiry) to prevent RLS failures
  },
  global: {
    fetch: createTimeoutFetch(DEFAULT_SUPABASE_REQUEST_TIMEOUT_MS),
    headers: {
      'X-Client-Info': 'nesttask@1.0.0',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    // Configure realtime to automatically reconnect on network changes
    params: {
      eventsPerSecond: 10
    },
    // Enable automatic reconnection
    heartbeatIntervalMs: 30000, // 30 seconds
    reconnectAfterMs: (tries: number) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      return Math.min(1000 * Math.pow(2, tries), 30000);
    }
  }
});

// Implement retry mechanism with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 300) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.status >= 500 && response.status < 600 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

// Cache for connection state
let connectionAttempts = 0;
let isInitialized = false;
let connectionPromise: Promise<boolean> | null = null;
let lastConnectionTime = 0;

// Track connection health
let lastActiveTime = Date.now();
let visibilityChangeCount = 0;
let isRefreshingSession = false;

/**
 * Session refresh handler - called when app becomes visible
 * Ensures session is valid and refreshes if needed
 */
async function refreshSessionOnResume() {
  if (isRefreshingSession) {
    console.log('[Supabase] Session refresh already in progress');
    return;
  }

  isRefreshingSession = true;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[Supabase] Failed to get session:', error.message);
      return;
    }
    
    if (!session) {
      console.log('[Supabase] No active session to refresh');
      return;
    }
    
    // Check if session is expired or about to expire
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const timeUntilExpiry = (expiresAt * 1000) - Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeUntilExpiry <= fiveMinutes) {
        console.log('[Supabase] Session expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[Supabase] Session refresh failed:', refreshError.message);
        } else {
          console.log('[Supabase] Session refreshed successfully');

          // Notify app listeners (e.g., task loader) to refetch with a fresh token.
          // Some environments (Android WebView / installed PWA) may not fire the same
          // lifecycle events, so we bridge here.
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail: { success: true } }));
          }
        }
      }
    }
  } catch (err) {
    console.error('[Supabase] Error during session refresh:', err);
  } finally {
    isRefreshingSession = false;
  }
}

// Listen for page visibility changes to detect potential connection issues
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const inactiveTime = now - lastActiveTime;
      
      console.log(`[Supabase] Tab visible after ${Math.round(inactiveTime/1000)}s`);
      
      // Refresh session when returning to tab
      await refreshSessionOnResume();
      
      // Reset connection state if inactive for more than 2 minutes
      if (inactiveTime > 2 * 60 * 1000) {
        console.log(`[Supabase] Resetting connection state after ${Math.round(inactiveTime/1000)}s inactivity`);
        connectionPromise = null;
        isInitialized = false;
      }
      
      visibilityChangeCount++;
      lastActiveTime = now;
      
      // Dispatch custom event to notify app components to refresh data
      window.dispatchEvent(new CustomEvent('supabase-visibility-refresh'));
    }
  });
  
  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('[Supabase] Network reconnected, validating session...');
    await refreshSessionOnResume();
    window.dispatchEvent(new CustomEvent('supabase-network-reconnect'));
  });
}

// Test connection with improved error handling
export async function testConnection(forceCheck = false) {
  // Update last active time
  lastActiveTime = Date.now();
  
  // In development mode, return true to bypass connection checks
  // This is a temporary workaround for local development
  if (import.meta.env.DEV) {
    console.log('[DEV MODE] Bypassing database connection check');
    
    // Check if environment variables are properly set
    if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
      console.error('⚠️ Supabase URL is not configured correctly!');
      console.info('Please set VITE_SUPABASE_URL in your .env file');
    }
    
    if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
      console.error('⚠️ Supabase Anon Key is not configured correctly!');
      console.info('Please set VITE_SUPABASE_ANON_KEY in your .env file');
    }
    
    return true;
  }
  
  // Force check if it's been a long time since last connection test
  const timeSinceLastCheck = Date.now() - lastConnectionTime;
  if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
    forceCheck = true;
    if (lastConnectionTime === 0) {
      console.log('Force connection check: no previous check recorded');
    } else {
      console.log(`Force connection check after ${Math.round(timeSinceLastCheck / 1000)}s`);
    }
  }
  
  if (isInitialized && !forceCheck) return true;
  if (connectionPromise) return connectionPromise;
  
  connectionPromise = (async () => {
    try {
      console.log(`Testing database connection (attempt ${connectionAttempts + 1})`);
      
      if (connectionAttempts >= 3) {
        console.warn('Max connection attempts reached, using fallback mode');
        return true;
      }
      
      connectionAttempts++;
      
      // Strict timeout for the entire connection test (5 seconds)
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timed out')), 5000)
      );
      
      const checkLogic = async () => {
        // First verify authentication status
        const { data: session, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth error when checking session:', authError.message);
          return false;
        }
        
        if (!session.session) {
          console.warn('No active session found - this is expected for first-time visitors');
          return true;
        }
        
        // Test database connection with a simpler query
        const { error } = await supabase.from('tasks').select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('Database connection error:', error.message, error.code);
          
          if (error.code === 'PGRST301' || error.message.includes('JWT')) {
            console.warn('JWT token invalid, signing out');
            await supabase.auth.signOut();
            return false;
          }

          // CRITICAL FIX: Detect actual network errors (offline) vs server errors
          // "Failed to fetch" is the standard error for network disconnects in fetch API
          const isNetworkError = 
            error.message.includes('Failed to fetch') || 
            error.message.includes('Network request failed') ||
            error.message.includes('connection refused') ||
            error.message.includes('timeout');

          if (isNetworkError) {
            console.warn('[Connection] Network error identified - reporting offline');
            return false;
          }
          
          console.warn('Continuing despite database error');
          return true;
        }
        
        return true;
      };

      try {
        const result = await Promise.race([checkLogic(), timeoutPromise]);
        
        if (result === true) {
          console.log('Database connection successful');
          isInitialized = true;
          lastConnectionTime = Date.now();
          return true;
        } else {
          return false;
        }
      } catch (timeoutErr) {
        console.warn('Connection test timed out - assuming offline or slow connection');
        // Return true to avoid blocking the app
        return true; 
      }

    } catch (error: any) {
      console.error('Unexpected error during connection test:', error.message);
      return true;
    } finally {
      setTimeout(() => {
        connectionPromise = null;
      }, 2000);
    }
  })();
  
  return connectionPromise;
}

// Initialize connection
setTimeout(() => {
  testConnection().catch(console.error);
}, 1000);

// Handle app resume to reconnect realtime and refresh session
if (typeof window !== 'undefined') {
  window.addEventListener('app-resume', async () => {
    console.log('[Supabase] App resumed, reconnecting...');

    // Defensive: clear any cached/possibly-stuck connection promise.
    // On Android WebView, pending fetches can become permanently stalled across background/foreground.
    connectionPromise = null;
    isInitialized = false;
    
    // Note: We used to manually reconnect channels here, but that conflicts with
    // specific hooks (like useNotifications) that manage their own subscription lifecycles.
    // Supabase client also handles WebSocket reconnection automatically.
    
    // Test connection
    await testConnection();
  });

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('[Supabase] Tab visible, checking connection...');
      testConnection().catch(console.error);
    }
  });

  // Handle online event
  window.addEventListener('online', async () => {
    console.log('[Supabase] Network online, reconnecting...');

    // If the device just came back online, ensure we don't reuse a stale connection check.
    connectionPromise = null;
    isInitialized = false;
    await testConnection();
  });
}

// Export connection status utility
export function getConnectionStatus() {
  return { isInitialized, connectionAttempts };
}