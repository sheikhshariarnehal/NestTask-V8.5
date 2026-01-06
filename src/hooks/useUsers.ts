import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUsers, deleteUser, promoteUser as promoteUserService, demoteUser as demoteUserService } from '../services/user.service';
import type { User } from '../types/auth';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);

  const loadUsers = useCallback(async (force = false) => {
    // Prevent concurrent requests
    if (loadingRef.current && !force) return;
    
    // Throttle requests (minimum 10 seconds between refreshes unless forced)
    const now = Date.now();
    if (!force && now - lastLoadTimeRef.current < 10000) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      lastLoadTimeRef.current = Date.now();
    } catch (err: any) {
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
    handleResumeRefreshRef.current = () => {
      loadUsers(true);
    };
  }, [loadUsers]);

  useEffect(() => {
    const handleResumeRefresh = () => {
      handleResumeRefreshRef.current?.();
    };

    window.addEventListener('app-resume', handleResumeRefresh);
    window.addEventListener('supabase-resume', handleResumeRefresh);
    window.addEventListener('supabase-session-refreshed', handleResumeRefresh);
    window.addEventListener('supabase-network-reconnect', handleResumeRefresh);
    window.addEventListener('supabase-visibility-refresh', handleResumeRefresh);

    return () => {
      window.removeEventListener('app-resume', handleResumeRefresh);
      window.removeEventListener('supabase-resume', handleResumeRefresh);
      window.removeEventListener('supabase-session-refreshed', handleResumeRefresh);
      window.removeEventListener('supabase-network-reconnect', handleResumeRefresh);
      window.removeEventListener('supabase-visibility-refresh', handleResumeRefresh);
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