import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { debugLog, updateDebugState } from './debug';

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
let lastConnectionTime = Date.now(); // Initialize to current time to avoid huge timeSinceLastCheck on first load

// Track connection health
let lastActiveTime = Date.now();
let visibilityChangeCount = 0;
let isRefreshingSession = false;

// ============================================
// Cached Auth User - prevents duplicate auth/v1/user API calls
// The performance trace showed 2-3 duplicate getUser() calls per page load
// ============================================
interface CachedUser {
  user: any;
  timestamp: number;
}
let cachedAuthUser: CachedUser | null = null;
let pendingGetUser: Promise<{ data: { user: any }; error: any }> | null = null;
const AUTH_USER_CACHE_TTL = 30000; // 30 seconds - short enough to catch logouts

/**
 * Get the current authenticated user with caching and deduplication.
 * This prevents multiple concurrent calls to auth/v1/user endpoint.
 * 
 * Use this instead of supabase.auth.getUser() for better performance.
 */
export async function getCachedUser(): Promise<{ data: { user: any }; error: any }> {
  // Return cached user if still valid
  if (cachedAuthUser && Date.now() - cachedAuthUser.timestamp < AUTH_USER_CACHE_TTL) {
    return { data: { user: cachedAuthUser.user }, error: null };
  }

  // If a request is already in flight, wait for it
  if (pendingGetUser) {
    return pendingGetUser;
  }

  // Make the actual request
  pendingGetUser = supabase.auth.getUser()
    .then((result) => {
      if (result.data.user) {
        cachedAuthUser = {
          user: result.data.user,
          timestamp: Date.now()
        };
      } else {
        cachedAuthUser = null;
      }
      return result;
    })
    .finally(() => {
      pendingGetUser = null;
    });

  return pendingGetUser;
}

/**
 * Clear the cached auth user.
 * Call this on logout or when session changes.
 */
export function clearCachedUser(): void {
  cachedAuthUser = null;
  pendingGetUser = null;
}

/**
 * Session refresh handler - called when app becomes visible
 * Ensures session is valid and refreshes if needed
 */
async function refreshSessionOnResume() {
  if (isRefreshingSession) {
    debugLog('SESSION', 'Session refresh already in progress, skipping');
    return;
  }

  isRefreshingSession = true;
  debugLog('SESSION', 'Starting session refresh on resume...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      debugLog('SESSION', '❌ Failed to get session', { error: error.message });
      updateDebugState({ lastError: error.message, isSessionValid: false });
      return;
    }
    
    if (!session) {
      debugLog('SESSION', 'No active session (user not logged in)');
      updateDebugState({ isSessionValid: false, sessionExpiresAt: null });
      return;
    }
    
    // Check if session is expired or about to expire
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresAtMs = expiresAt * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAtMs - now;
      const fiveMinutes = 5 * 60 * 1000;
      
      updateDebugState({ 
        sessionExpiresAt: expiresAtMs,
        lastSessionCheck: now,
      });
      
      debugLog('SESSION', 'Session status', {
        expiresAt: new Date(expiresAtMs).toISOString(),
        expiresInMinutes: Math.round(timeUntilExpiry / 60000),
        isExpired: timeUntilExpiry <= 0,
      });
      
      // Session already expired!
      if (timeUntilExpiry <= 0) {
        debugLog('SESSION', '🔴 SESSION EXPIRED! Attempting refresh...');
        updateDebugState({ isSessionValid: false, hardRefreshNeeded: true });
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          debugLog('SESSION', '❌ Session refresh FAILED - user needs to re-login', { 
            error: refreshError.message 
          });
          updateDebugState({ lastError: refreshError.message });
          // Sign out and redirect to login
          await supabase.auth.signOut();
          window.location.reload();
          return;
        }
        
        if (refreshData.session) {
          const newExpiresAt = refreshData.session.expires_at! * 1000;
          debugLog('SESSION', '✅ Session refreshed after expiry', {
            newExpiresAt: new Date(newExpiresAt).toISOString(),
          });
          updateDebugState({ 
            sessionExpiresAt: newExpiresAt, 
            isSessionValid: true,
            hardRefreshNeeded: false,
          });
        }
        return;
      }
      
      // Session expiring soon
      if (timeUntilExpiry <= fiveMinutes) {
        debugLog('SESSION', '🟡 Session expiring soon, refreshing proactively...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          debugLog('SESSION', '❌ Proactive session refresh failed', { error: refreshError.message });
          updateDebugState({ lastError: refreshError.message });
        } else if (refreshData.session) {
          const newExpiresAt = refreshData.session.expires_at! * 1000;
          debugLog('SESSION', '✅ Session refreshed proactively', {
            newExpiresAt: new Date(newExpiresAt).toISOString(),
          });
          updateDebugState({ 
            sessionExpiresAt: newExpiresAt, 
            isSessionValid: true 
          });
        }
      } else {
        debugLog('SESSION', '✅ Session is valid', {
          expiresInMinutes: Math.round(timeUntilExpiry / 60000),
        });
        updateDebugState({ isSessionValid: true });
      }
    }
  } catch (err: any) {
    debugLog('SESSION', '❌ Error during session refresh', { error: err.message });
    updateDebugState({ lastError: err.message });
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
      
      visibilityChangeCount++;
      updateDebugState({ 
        visibilityChanges: visibilityChangeCount,
        lastActiveAt: now,
      });
      
      debugLog('VISIBILITY', `Tab became visible after ${Math.round(inactiveTime/1000)}s`, {
        inactiveMinutes: Math.round(inactiveTime / 60000),
        visibilityChanges: visibilityChangeCount,
      });
      
      // Refresh session when returning to tab
      await refreshSessionOnResume();
      
      // Reset connection state if inactive for more than 2 minutes
      if (inactiveTime > 2 * 60 * 1000) {
        debugLog('CONNECTION', `Resetting connection state after ${Math.round(inactiveTime/1000)}s inactivity`);
        connectionPromise = null;
        isInitialized = false;
        updateDebugState({ connectionState: 'disconnected' });
      }
      
      lastActiveTime = now;
      
      // Dispatch custom event to notify app components to refresh data
      window.dispatchEvent(new CustomEvent('supabase-visibility-refresh'));
    }
  });
  
  // Listen for online/offline events
  window.addEventListener('online', async () => {
    debugLog('NETWORK', 'Network reconnected, validating session...');
    updateDebugState({ networkReconnects: (updateDebugState as any).networkReconnects + 1 });
    await refreshSessionOnResume();
    window.dispatchEvent(new CustomEvent('supabase-network-reconnect'));
  });
  
  window.addEventListener('offline', () => {
    debugLog('NETWORK', '⚠️ Network disconnected');
    updateDebugState({ connectionState: 'disconnected' });
  });
}

// Test connection with improved error handling
export async function testConnection(forceCheck = false) {
  // Update last active time
  lastActiveTime = Date.now();
  updateDebugState({ lastActiveAt: lastActiveTime, connectionState: 'checking' });
  
  // In development mode, return true to bypass connection checks
  // This is a temporary workaround for local development
  if (import.meta.env.DEV) {
    debugLog('CONNECTION', '[DEV MODE] Bypassing database connection check');
    
    // Check if environment variables are properly set
    if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
      console.error('⚠️ Supabase URL is not configured correctly!');
      console.info('Please set VITE_SUPABASE_URL in your .env file');
    }
    
    if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
      console.error('⚠️ Supabase Anon Key is not configured correctly!');
      console.info('Please set VITE_SUPABASE_ANON_KEY in your .env file');
    }
    
    updateDebugState({ connectionState: 'connected' });
    return true;
  }
  
  // Force check if it's been a long time since last connection test
  const timeSinceLastCheck = Date.now() - lastConnectionTime;
  if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
    forceCheck = true;
    debugLog('CONNECTION', `Force connection check after ${Math.round(timeSinceLastCheck/1000)}s of inactivity`);
  }
  
  if (isInitialized && !forceCheck) {
    updateDebugState({ connectionState: 'connected' });
    return true;
  }
  if (connectionPromise) return connectionPromise;
  
  connectionPromise = (async () => {
    try {
      debugLog('CONNECTION', `Testing database connection (attempt ${connectionAttempts + 1})`);
      
      if (connectionAttempts >= 3) {
        debugLog('CONNECTION', '⚠️ Max connection attempts reached, using fallback mode');
        // Return true anyway to prevent app from being stuck in retry loop
        updateDebugState({ connectionState: 'connected' });
        return true;
      }
      
      connectionAttempts++;
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000); // 5 second timeout (reduced from 10s)
      });
      
      // First verify authentication status with timeout
      const { data: session, error: authError } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;
      
      if (authError) {
        debugLog('CONNECTION', '❌ Auth error when checking session', { error: authError.message });
        updateDebugState({ connectionState: 'disconnected', lastError: authError.message });
        return false;
      }
      
      if (!session.session) {
        debugLog('CONNECTION', 'No active session found - user needs to login');
        updateDebugState({ connectionState: 'connected', isSessionValid: false });
        // Return true anyway so the user can see the login page
        return true;
      }
      
      // Log session details
      const expiresAt = session.session.expires_at;
      if (expiresAt) {
        const expiresAtMs = expiresAt * 1000;
        const timeUntilExpiry = expiresAtMs - Date.now();
        debugLog('CONNECTION', 'Session found', {
          expiresAt: new Date(expiresAtMs).toISOString(),
          expiresInMinutes: Math.round(timeUntilExpiry / 60000),
          isExpired: timeUntilExpiry <= 0,
          userId: session.session.user?.id?.substring(0, 8) + '...',
        });
        updateDebugState({ 
          sessionExpiresAt: expiresAtMs, 
          isSessionValid: timeUntilExpiry > 0,
          lastSessionCheck: Date.now(),
        });
        
        // If session expired, try to refresh it
        if (timeUntilExpiry <= 0) {
          debugLog('CONNECTION', '🔴 Session expired during connection test, attempting refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            debugLog('CONNECTION', '❌ Failed to refresh expired session', { error: refreshError.message });
            updateDebugState({ lastError: refreshError.message, hardRefreshNeeded: true });
            await supabase.auth.signOut();
            return false;
          }
          
          if (refreshData.session) {
            debugLog('CONNECTION', '✅ Refreshed expired session successfully');
            updateDebugState({ 
              sessionExpiresAt: refreshData.session.expires_at! * 1000,
              isSessionValid: true,
              hardRefreshNeeded: false,
            });
          }
        }
      }
      
      // Test database connection with a simpler query and timeout
      debugLog('CONNECTION', 'Testing database query...');
      const queryTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000); // 5 second timeout (reduced from 10s)
      });
      
      const { error } = await Promise.race([
        supabase.from('tasks').select('count', { count: 'exact', head: true }),
        queryTimeoutPromise
      ]) as Awaited<ReturnType<typeof supabase.from>>;
      
      if (error) {
        debugLog('CONNECTION', '❌ Database connection error', { 
          message: error.message, 
          code: error.code 
        });
        
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          debugLog('CONNECTION', '🔴 JWT token invalid, signing out user');
          updateDebugState({ connectionState: 'disconnected', isSessionValid: false, hardRefreshNeeded: true });
          await supabase.auth.signOut();
          return false;
        }
        
        // Allow continuing anyway after logging the error
        debugLog('CONNECTION', '⚠️ Continuing despite database error');
        updateDebugState({ connectionState: 'connected', lastError: error.message });
        return true;
      }
      
      debugLog('CONNECTION', '✅ Database connection successful');
      isInitialized = true;
      lastConnectionTime = Date.now();
      updateDebugState({ connectionState: 'connected' });
      return true;
    } catch (error: any) {
      debugLog('CONNECTION', '❌ Unexpected error during connection test', { error: error.message });
      updateDebugState({ connectionState: 'disconnected', lastError: error.message });
      
      // If timeout, warn but don't block the app
      if (error.message?.includes('timeout')) {
        console.warn('[CONNECTION] Connection test timed out - network may be slow');
        updateDebugState({ connectionState: 'connected' }); // Assume connected for now
        return true; // Allow app to continue
      }
      
      // Return true anyway to prevent blocking the app
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

// Track if we're already reconnecting to prevent duplicate operations
let isReconnecting = false;
let lastResumeTime = 0;

// Handle app resume to refresh session and test connection
// Note: Supabase realtime has built-in reconnection logic, so we don't manually
// resubscribe channels (which causes "subscribe multiple times" errors).
// Instead, we just verify the connection and let the SDK handle channel recovery.
if (typeof window !== 'undefined') {
  window.addEventListener('app-resume', async () => {
    // Debounce: ignore resume events within 500ms of each other
    const now = Date.now();
    if (now - lastResumeTime < 500) {
      console.log('[Supabase] Debouncing rapid resume event');
      return;
    }
    lastResumeTime = now;
    
    if (isReconnecting) {
      console.log('[Supabase] Reconnection already in progress, skipping');
      return;
    }
    
    isReconnecting = true;
    console.log('[Supabase] App resumed, checking connection...');
    
    // Test connection in background - don't block on this
    // The realtime SDK handles channel reconnection automatically
    testConnection().then(() => {
      // Log channel status for debugging
      const channels = supabase.getChannels();
      console.log(`[Supabase] Active channels: ${channels.length}`);
    }).catch((err) => {
      console.warn('[Supabase] Background connection test failed:', err.message);
    }).finally(() => {
      isReconnecting = false;
    });
    
    // Don't wait for connection test to complete
    isReconnecting = false;
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
    await testConnection();
  });
}

// Export connection status utility
export function getConnectionStatus() {
  return { isInitialized, connectionAttempts };
}