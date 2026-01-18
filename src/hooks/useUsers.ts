import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUsers, deleteUser, promoteUser as promoteUserService, demoteUser as demoteUserService } from '../services/user.service';
import type { User } from '../types/auth';
import { createDebouncedEventHandler } from '../utils/eventDebounce';
import { useSessionReady } from '../contexts/SessionReadyContext';

export function useUsers() {
  // Session-ready gate: prevents data fetching until session is validated
  const { isSessionReady, isValidating } = useSessionReady();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);

  const loadUsers = useCallback(async (force = false) => {
    // CRITICAL: Gate on session ready to prevent cold start failures
    if (!isSessionReady) {
      console.log('[useUsers] Session not ready, waiting for validation...');
      return;
    }
    
    // Prevent concurrent requests
    if (loadingRef.current && !force) return;
    
    // For forced refresh (hard refresh), skip throttling
    if (force) {
      console.log('[useUsers] Force refresh - bypassing throttle and cache');
    } else {
      // Throttle requests (minimum 10 seconds between refreshes unless forced)
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 10000) {
        console.log('[useUsers] Refresh throttled');
        return;
      }
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null); // Clear any previous errors
      
      console.log('[useUsers] Fetching users from database...');
      const data = await fetchUsers();
      setUsers(data);
      lastLoadTimeRef.current = Date.now();
      console.log(`[useUsers] Successfully loaded ${data.length} users`);
    } catch (err: any) {
      console.error('[useUsers] Failed to load users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isSessionReady]);

  // Initial load - gates on isSessionReady
  useEffect(() => {
    if (isSessionReady) {
      console.log('[useUsers] Session ready, starting initial load');
      loadUsers(true);
    }
  }, [loadUsers, isSessionReady]);

  // Use stable callback reference to prevent memory leaks
  const handleResumeRefreshRef = useRef<() => void>();
  
  useEffect(() => {
    handleResumeRefreshRef.current = async () => {
      console.log('[useUsers] Resume detected, validating session first...');
      
      try {
        // Wait for session validation before refreshing users
        const sessionValidPromise = new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          const handler = () => {
            clearTimeout(timeout);
            window.removeEventListener('supabase-session-validated', handler);
            resolve();
          };
          window.addEventListener('supabase-session-validated', handler, { once: true });
        });
        
        window.dispatchEvent(new CustomEvent('request-session-validation'));
        await sessionValidPromise;
        
        console.log('[useUsers] Session validated, refreshing users');
        loadUsers(true);
      } catch (error) {
        console.error('[useUsers] Session validation failed:', error);
        loadUsers(true);
      }
    };
  }, [loadUsers]);

  useEffect(() => {
    const handleResumeRefresh = () => {
      handleResumeRefreshRef.current?.();
    };

    // Debounce to prevent duplicate calls
    const debouncedRefresh = createDebouncedEventHandler(handleResumeRefresh, 1000);

    window.addEventListener('app-resume', debouncedRefresh);
    window.addEventListener('supabase-session-refreshed', debouncedRefresh);

    return () => {
      window.removeEventListener('app-resume', debouncedRefresh);
      window.removeEventListener('supabase-session-refreshed', debouncedRefresh);
    };
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null);
      await deleteUser(userId);
      // Optimistically update local state instead of reloading
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
      // Reload on error to restore correct state
      await loadUsers(true);
      throw err;
    }
  };

  const handlePromoteUser = async (userId: string, role: 'admin' | 'section-admin') => {
    try {
      setError(null);
      await promoteUserService(userId, role);
      // Optimistically update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) {
      setError(err.message);
      await loadUsers(true);
      throw err;
    }
  };

  const handleDemoteUser = async (userId: string, role: 'user') => {
    try {
      setError(null);
      await demoteUserService(userId, role);
      // Optimistically update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) {
      setError(err.message);
      await loadUsers(true);
      throw err;
    }
  };

  return {
    users,
    // Include isValidating in loading state so UI shows skeleton during cold start validation
    loading: loading || isValidating,
    error,
    refreshUsers: () => loadUsers(true),
    deleteUser: handleDeleteUser,
    promoteUser: handlePromoteUser,
    demoteUser: handleDemoteUser
  };
}