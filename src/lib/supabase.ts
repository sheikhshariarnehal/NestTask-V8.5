import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

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

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please click "Connect to Supabase" to set up your project.');
}

// Create optimized Supabase client with retry logic
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'nesttask_supabase_auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'nesttask@1.0.0',
      'Cache-Control': 'no-cache'
    }
  },
  db: {
    schema: 'public'
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

// Listen for page visibility changes to detect potential connection issues
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Reset connection if we've been away for a while
      const now = Date.now();
      const inactiveTime = now - lastActiveTime;
      
      // Only reset if we were inactive for more than 10 minutes (increased from 5)
      // This reduces unnecessary connection resets that cause blank screens
      if (inactiveTime > 10 * 60 * 1000) {
        console.log(`Resetting connection state after ${Math.round(inactiveTime/1000)}s inactivity`);
        connectionPromise = null;
        isInitialized = false;
        // Don't force reconnection immediately - let it happen naturally
        // This prevents race conditions that can cause blank screens
      }
      
      visibilityChangeCount++;
      lastActiveTime = now;
    }
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