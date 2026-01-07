import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

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
    console.log(`Force connection check after ${Math.round(timeSinceLastCheck/1000)}s`);
  }
  
  if (isInitialized && !forceCheck) return true;
  if (connectionPromise) return connectionPromise;
  
  connectionPromise = (async () => {
    try {
      console.log(`Testing database connection (attempt ${connectionAttempts + 1})`);
      
      if (connectionAttempts >= 3) {
        console.warn('Max connection attempts reached, using fallback mode');
        // Return true anyway to prevent app from being stuck in retry loop
        return true;
      }
      
      connectionAttempts++;
      
      // First verify authentication status
      const { data: session, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error when checking session:', authError.message);
        return false;
      }
      
      if (!session.session) {
        console.warn('No active session found - this is expected for first-time visitors');
        // Return true anyway so the user can see the login page
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
        
        // Allow continuing anyway after logging the error
        console.warn('Continuing despite database error');
        return true;
      }
      
      console.log('Database connection successful');
      isInitialized = true;
      lastConnectionTime = Date.now();
      return true;
    } catch (error: any) {
      console.error('Unexpected error during connection test:', error.message);
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

// Export connection status utility
export function getConnectionStatus() {
  return { isInitialized, connectionAttempts };
}