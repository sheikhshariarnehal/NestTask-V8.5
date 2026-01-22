import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUsers, deleteUser, promoteUser as promoteUserService, demoteUser as demoteUserService } from '../services/user.service';
import type { User } from '../types/auth';
import { deduplicate } from '../lib/requestDeduplicator';

// Shared cache for users data across all useUsers hook instances
// This prevents duplicate API calls when multiple components use useUsers
let sharedUsersCache: { data: User[]; timestamp: number } | null = null;
let pendingFetch: Promise<User[]> | null = null;
const USERS_CACHE_TTL = 10000; // 10 seconds

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);

  const loadUsers = useCallback(async (force = false) => {
    // Prevent concurrent requests
    if (loadingRef.current && !force) return;
    
    // Check shared cache first (prevents duplicate API calls across components)
    if (!force && sharedUsersCache && Date.now() - sharedUsersCache.timestamp < USERS_CACHE_TTL) {
      console.log('[useUsers] Using shared cache');
      setUsers(sharedUsersCache.data);
      setLoading(false);
      return;
    }
    
    // For forced refresh (hard refresh), skip throttling
    // BUT don't clear pending fetch if there's one in progress - just wait for it
    if (force) {
      console.log('[useUsers] Force refresh requested');
      // Only clear cache if no pending fetch (to allow deduplication of concurrent force requests)
      if (!pendingFetch) {
        sharedUsersCache = null;
      }
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
      
      // Deduplicate concurrent requests using shared promise
      if (!pendingFetch) {
        pendingFetch = fetchUsers().finally(() => {
          pendingFetch = null;
        });
      }
      
      const data = await pendingFetch;
      
      // Update shared cache
      sharedUsersCache = { data, timestamp: Date.now() };
      
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
  }, []);

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  // Use stable callback reference to prevent memory leaks
  const handleResumeRefreshRef = useRef<() => void>();
  
  useEffect(() => {
    handleResumeRefreshRef.current = async () => {
      console.log('[useUsers] Resume detected, validating session first...');
      
      console.log('[useUsers] Resume ready, refreshing users');
      loadUsers(true);
    };
  }, [loadUsers]);

  useEffect(() => {
    const handleResumeRefresh = () => {
      handleResumeRefreshRef.current?.();
    };

    // Listen to coordinated resume event
    window.addEventListener('app-resume-ready', handleResumeRefresh);

    return () => {
      window.removeEventListener('app-resume-ready', handleResumeRefresh);
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
    loading,
    error,
    refreshUsers: () => loadUsers(true),
    deleteUser: handleDeleteUser,
    promoteUser: handlePromoteUser,
    demoteUser: handleDemoteUser
  };
}