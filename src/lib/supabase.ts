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
    autoRefreshToken: false, // CRITICAL: Disable SDK auto-refresh to prevent infinite loop with HTTP bypass
    // Note: Session refresh is handled manually by HTTP bypass + useSupabaseLifecycle hook
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

type SessionResult = {
  data: { session: any };
  error: any;
};

let getSessionInFlight: Promise<SessionResult> | null = null;
let lastSessionResult: SessionResult | null = null;
let lastSessionResultAt = 0;

/**
 * Storage keys for Supabase auth - check both custom and default keys
 * The custom key is set in our client config, but the default key may exist
 * from previous sessions or if the custom key wasn't applied
 */
const SUPABASE_AUTH_STORAGE_KEYS = [
  'nesttask_supabase_auth',  // Our custom key
  'supabase.auth.token',      // Default Supabase key
  `sb-${new URL(supabaseUrl || 'https://placeholder.supabase.co').hostname.split('.')[0]}-auth-token` // Project-specific key
];

/**
 * Attempt to read session directly from localStorage when getSession() hangs.
 * This is a workaround for Android WebView storage lock issues.
 * Checks multiple possible storage keys for compatibility.
 */
function getSessionFromStorage(): { access_token?: string; refresh_token?: string; expires_at?: number; user?: any } | null {
  for (const key of SUPABASE_AUTH_STORAGE_KEYS) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      
      const parsed = JSON.parse(stored);
      // Supabase stores session in various formats depending on version
      // Check for direct session or nested structure
      if (parsed.access_token && parsed.refresh_token) {
        console.log(`[Supabase] Found session in storage key: ${key}`);
        return parsed;
      }
      if (parsed.currentSession?.access_token && parsed.currentSession?.refresh_token) {
        console.log(`[Supabase] Found session in storage key: ${key} (currentSession)`);
        return parsed.currentSession;
      }
      if (parsed.session?.access_token && parsed.session?.refresh_token) {
        console.log(`[Supabase] Found session in storage key: ${key} (session)`);
        return parsed.session;
      }
    } catch (e) {
      // Continue to next key
    }
  }
  console.warn('[Supabase] No session found in any storage key');
  return null;
}

/**
 * SYNCHRONOUS session expiry check - reads directly from localStorage without async calls
 * This prevents 8-10 second timeouts on cold start by avoiding getSession() entirely
 * Returns: { needsRefresh: boolean, isExpired: boolean, session: object | null }
 */
export function checkSessionExpirySynchronous(): { needsRefresh: boolean; isExpired: boolean; session: any | null } {
  try {
    const session = getSessionFromStorage();
    
    if (!session) {
      console.log('[SessionCheck] No session in storage');
      return { needsRefresh: false, isExpired: false, session: null };
    }
    
    if (!session.expires_at) {
      console.warn('[SessionCheck] Session has no expiry, assuming valid');
      return { needsRefresh: false, isExpired: false, session };
    }
    
    const now = Date.now();
    const expiryTime = session.expires_at * 1000; // Convert to milliseconds
    const timeUntilExpiry = expiryTime - now;
    
    const isExpired = timeUntilExpiry <= 0;
    const expiringIn5Min = timeUntilExpiry < 5 * 60 * 1000;
    const needsRefresh = isExpired || expiringIn5Min;
    
    console.log(`[SessionCheck] Session expires in ${Math.round(timeUntilExpiry / 1000)}s (expired: ${isExpired}, needsRefresh: ${needsRefresh})`);
    
    return { needsRefresh, isExpired, session };
  } catch (e: any) {
    console.error('[SessionCheck] Error checking session:', e.message);
    return { needsRefresh: false, isExpired: false, session: null };
  }
}

/**
 * Force refresh session using refresh_token from localStorage.
 * This bypasses the hung SDK methods by making a DIRECT HTTP call to Supabase Auth API.
 * This is the ultimate fallback when both getSession() and refreshSession() hang.
 */
async function forceRefreshFromStorage(): Promise<SessionResult> {
  console.log('[Supabase] Attempting force refresh from stored token...');
  
  const storedSession = getSessionFromStorage();
  if (!storedSession?.refresh_token) {
    console.log('[Supabase] No stored refresh token found');
    return { data: { session: null }, error: new Error('No stored refresh token') };
  }
  
  console.log('[Supabase] Found stored refresh token, forcing refresh via direct HTTP call...');
  
  try {
    // CRITICAL: Bypass SDK entirely and make direct HTTP call to Supabase Auth API
    // This avoids the SDK's internal state machine which can deadlock
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey || '',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        refresh_token: storedSession.refresh_token
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Supabase] Direct refresh HTTP error:', response.status, errorText);
      return { data: { session: null }, error: new Error(`HTTP ${response.status}: ${errorText}`) };
    }
    
    const data = await response.json();
    
    if (data.access_token && data.refresh_token) {
      console.log('[Supabase] Direct HTTP refresh successful!');
      
      // Build session object matching Supabase format
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type || 'bearer',
        user: data.user
      };
      
      // Store the refreshed session in localStorage so SDK can pick it up
      // Store in all possible keys to maximize compatibility
      const sessionJson = JSON.stringify(session);
      for (const key of SUPABASE_AUTH_STORAGE_KEYS.slice(0, 2)) {
        try {
          localStorage.setItem(key, sessionJson);
        } catch (e) {
          console.warn(`[Supabase] Failed to store session in ${key}:`, e);
        }
      }
      
      // Notify SDK that session was updated (it may pick up from storage)
      // IMPORTANT: Broadcast events FIRST, then attempt setSession
      // This ensures hooks don't wait for setSession which may hang
      const recoveryTimestamp = Date.now();
      if (typeof window !== 'undefined') {
        console.log(`[Supabase] Broadcasting session-recovered event at ${recoveryTimestamp}`);
        window.dispatchEvent(new CustomEvent('supabase-session-recovered', { 
          detail: { session, timestamp: recoveryTimestamp } 
        }));
        console.log('[Supabase] Broadcasting session-validated event with recovered flag');
        window.dispatchEvent(new CustomEvent('supabase-session-validated', { 
          detail: { success: true, recovered: true, timestamp: recoveryTimestamp } 
        }));
        console.log('[Supabase] All recovery events dispatched');
      }
      
      // CRITICAL: Hydrate SDK with fresh session synchronously to ensure subsequent queries work
      // After HTTP refresh, the Supabase client MUST be updated or queries will fail with stale token
      
      // Notify that session recovery is in critical phase (don't background during this)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-session-recovery-start'));
      }
      
      // If setSession takes >20s, it means the SDK is stuck (cold start issue)
      // Better to hard refresh and get fresh code than wait forever
      const setSessionTimeout = setTimeout(() => {
        console.warn('[Supabase] ⚠️ setSession taking too long (>20s), forcing page reload to get fresh code...');
        window.location.reload();
      }, 20000); // 20 second safety timeout
      
      try {
        console.log('[Supabase] Hydrating SDK with fresh token (may take a few seconds on cold start)...');
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        clearTimeout(setSessionTimeout); // Cancel reload if successful
        console.log('[Supabase] ✅ SDK session hydrated successfully - queries will use fresh token');
        
        // Notify that session recovery completed (app can background normally now)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-session-recovery-complete'));
        }
      } catch (e: any) {
        clearTimeout(setSessionTimeout);
        console.error('[Supabase] ❌ setSession failed - forcing page reload to recover:', e);
        
        // Notify recovery failed before reload
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-session-recovery-complete'));
        }
        
        // Force reload to get fresh code rather than being stuck with broken state
        setTimeout(() => window.location.reload(), 1000);
        throw new Error(`Failed to hydrate Supabase client with fresh token: ${e.message}`);
      }
      
      console.log('[Supabase] HTTP refresh complete, returning session');
      return { data: { session }, error: null };
    }
    
    console.error('[Supabase] Direct refresh returned no tokens');
    return { data: { session: null }, error: new Error('Refresh returned no tokens') };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.error('[Supabase] Direct HTTP refresh timed out');
      return { data: { session: null }, error: new Error('Direct HTTP refresh timed out') };
    }
    console.error('[Supabase] Direct HTTP refresh exception:', e?.message);
    return { data: { session: null }, error: e };
  }
}

/**
 * Android WebView can deadlock/stall on concurrent access to auth storage.
 * This helper enforces a single in-flight getSession() call and applies a hard timeout.
 * If getSession() times out, it attempts to recover by refreshing from stored token.
 */
export async function getSessionSafe(options: { timeoutMs?: number; maxAgeMs?: number } = {}): Promise<SessionResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxAgeMs = options.maxAgeMs ?? 1000;

  const now = Date.now();
  if (lastSessionResult && now - lastSessionResultAt <= maxAgeMs) {
    return lastSessionResult;
  }

  if (getSessionInFlight) return getSessionInFlight;

  getSessionInFlight = (async () => {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<SessionResult>((resolve) =>
      setTimeout(
        () => resolve({ data: { session: null }, error: new Error('Session retrieval timed out') }),
        timeoutMs
      )
    );

    try {
      const res = await Promise.race([sessionPromise, timeoutPromise]);
      
      // CRITICAL FIX: If getSession timed out, try to recover from localStorage
      if (res.error?.message === 'Session retrieval timed out') {
        console.log('[Supabase] getSession() timed out, attempting recovery from storage...');
        
        const recoveryResult = await forceRefreshFromStorage();
        if (recoveryResult.data.session) {
          // Recovery successful!
          lastSessionResult = recoveryResult;
          lastSessionResultAt = Date.now();
          
          // Dispatch events to notify app
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail: { success: true } }));
          }
          
          return recoveryResult;
        }
        
        // Recovery failed - return the original timeout error
        console.warn('[Supabase] Storage recovery failed, returning timeout error');
      }
      
      lastSessionResult = res;
      lastSessionResultAt = Date.now();
      return res;
    } catch (err: any) {
      const res: SessionResult = { data: { session: null }, error: err };
      lastSessionResult = res;
      lastSessionResultAt = Date.now();
      return res;
    } finally {
      // Allow a new attempt shortly after this one completes
      setTimeout(() => {
        getSessionInFlight = null;
      }, 250);
    }
  })();

  return getSessionInFlight;
}

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

// Cold start detection - track when app was last active
const LAST_ACTIVE_KEY = 'nesttask_last_active_time';
const EXTENDED_INACTIVITY_THRESHOLD = 60 * 60 * 1000; // 1 hour

/**
 * Store current time as last active time
 * Called periodically and on app background
 */
export function updateLastActiveTime() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Check if app was inactive for extended period (cold start detection)
 * Returns true if session should be force-refreshed
 */
export function wasInactiveForExtendedPeriod(): boolean {
  try {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) return true; // First launch or cleared storage
    
    const inactiveDuration = Date.now() - parseInt(lastActive, 10);
    return inactiveDuration > EXTENDED_INACTIVITY_THRESHOLD;
  } catch {
    return true; // Assume extended inactivity if storage fails
  }
}

/**
 * Critical cold start session validation
 * Called BEFORE any data fetching on app initialization
 * Returns true if session is valid, false if user should re-login
 */
export async function validateSessionOnColdStart(timeoutMs = 15000): Promise<{ valid: boolean; session: any | null; error?: Error }> {
  console.log('[Supabase] Cold start session validation...');
  
  const wasExtendedInactive = wasInactiveForExtendedPeriod();
  console.log(`[Supabase] Extended inactivity: ${wasExtendedInactive}`);
  
  try {
    // Get current session with generous timeout for cold start
    const { data: { session }, error } = await getSessionSafe({ timeoutMs, maxAgeMs: 0 });
    
    if (error) {
      // If getSession timed out and recovery from storage also failed,
      // try one more direct attempt to refresh from storage
      if (error.message?.includes('timed out') || error.message?.includes('No stored refresh token')) {
        console.log('[Supabase] Cold start: getSession failed, trying direct storage refresh...');
        
        const directRecovery = await forceRefreshFromStorage();
        if (directRecovery.data.session) {
          console.log('[Supabase] Cold start: Direct storage refresh successful!');
          updateLastActiveTime();
          
          // Notify listeners
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail: { success: true } }));
          }
          
          return { valid: true, session: directRecovery.data.session };
        }
        
        // Check if there's a stored session we can try to use anyway
        const storedSession = getSessionFromStorage();
        if (storedSession?.access_token) {
          console.log('[Supabase] Cold start: Using stored session (may be stale)');
          // Allow app to proceed with potentially stale session
          // The actual API calls will fail if it's truly expired, triggering re-login
          return { valid: true, session: storedSession };
        }
        
        console.error('[Supabase] Cold start: No recoverable session found');
        return { valid: false, session: null, error };
      }
      
      console.error('[Supabase] Cold start session error:', error.message);
      return { valid: false, session: null, error };
    }
    
    if (!session) {
      // No session but no error - check storage directly as fallback
      const storedSession = getSessionFromStorage();
      if (storedSession?.refresh_token) {
        console.log('[Supabase] Cold start: No session from API but found stored token, attempting refresh...');
        const directRecovery = await forceRefreshFromStorage();
        if (directRecovery.data.session) {
          console.log('[Supabase] Cold start: Recovered session from storage!');
          updateLastActiveTime();
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail: { success: true } }));
          }
          
          return { valid: true, session: directRecovery.data.session };
        }
      }
      
      console.log('[Supabase] No session on cold start - user needs to login');
      return { valid: true, session: null }; // No session is valid state (not logged in)
    }
    
    // Check if session is expired
    const expiresAt = session.expires_at;
    const now = Date.now();
    
    if (expiresAt) {
      const expiryTime = expiresAt * 1000;
      const timeUntilExpiry = expiryTime - now;
      
      // Force refresh if: expired, expiring soon, or extended inactivity
      const shouldRefresh = timeUntilExpiry <= 0 || 
                           timeUntilExpiry < 5 * 60 * 1000 || // Less than 5 min
                           wasExtendedInactive;
      
      if (shouldRefresh) {
        console.log(`[Supabase] Cold start: forcing session refresh (expired: ${timeUntilExpiry <= 0}, soon: ${timeUntilExpiry < 5 * 60 * 1000}, inactive: ${wasExtendedInactive})`);
        
        // Attempt refresh with retry
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              // Check for invalid refresh token (user must re-login)
              if (refreshError.message?.includes('Invalid Refresh Token') || 
                  refreshError.message?.includes('invalid_grant')) {
                console.error('[Supabase] Refresh token invalid, user must re-login');
                return { valid: false, session: null, error: refreshError };
              }
              
              console.warn(`[Supabase] Refresh attempt ${attempt + 1} failed:`, refreshError.message);
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }
            }
            
            if (data.session) {
              console.log('[Supabase] Cold start session refreshed successfully');
              updateLastActiveTime();
              
              // Notify listeners
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
                window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail: { success: true } }));
              }
              
              return { valid: true, session: data.session };
            }
          } catch (e: any) {
            console.warn(`[Supabase] Refresh attempt ${attempt + 1} exception:`, e?.message);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }
        
        // All refresh attempts failed
        console.error('[Supabase] Cold start session refresh failed after 3 attempts');
        // Return current session as "valid" to allow app to try - might work for offline
        return { valid: true, session };
      }
    }
    
    // Session is valid
    console.log('[Supabase] Cold start session valid');
    updateLastActiveTime();
    return { valid: true, session };
    
  } catch (e: any) {
    console.error('[Supabase] Cold start validation exception:', e?.message);
    return { valid: false, session: null, error: e };
  }
}

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
    const { data: { session }, error } = await getSessionSafe({ timeoutMs: 8000 });
    
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
        // Treat as "good enough" for now to avoid hammering the network.
        // Reset attempts so a future forced check can try again.
        connectionAttempts = 0;
        isInitialized = true;
        lastConnectionTime = Date.now();
        return true;
      }
      
      connectionAttempts++;
      
      // Strict timeout for the entire connection test (5 seconds)
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timed out')), 5000)
      );
      
      const checkLogic = async () => {
        // First verify authentication status using SYNCHRONOUS check (no timeout!)
        const { session: storedSession } = checkSessionExpirySynchronous();
        
        if (!storedSession) {
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
          connectionAttempts = 0;
          lastConnectionTime = Date.now();
          return true;
        } else {
          return false;
        }
      } catch (timeoutErr) {
        console.warn('Connection test timed out - assuming offline or slow connection');
        // Return true to avoid blocking the app, but also avoid immediate re-testing loops.
        isInitialized = true;
        lastConnectionTime = Date.now();
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
  // Track last active time when app goes to background
  window.addEventListener('app-background', () => {
    updateLastActiveTime();
  });
  
  // Also track on visibility hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      updateLastActiveTime();
    }
  });
  
  // Periodic heartbeat to track activity (every 5 minutes)
  setInterval(() => {
    if (!document.hidden) {
      updateLastActiveTime();
    }
  }, 5 * 60 * 1000);
  
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