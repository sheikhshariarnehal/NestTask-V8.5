import { useState, useEffect, useCallback } from 'react';
import { 
  fetchAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  resetAdminPassword, 
  deleteAdminUser,
  fetchPermissions,
  fetchAdminLogs,
  fetchAdminStats
} from '../services/admin.service';
import type { AdminUser, AdminPermission, AdminLog, AdminStats } from '../types/admin';

export function useAdminManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState({
    users: true,
    permissions: true,
    logs: true,
    stats: true
  });
  const [error, setError] = useState<string | null>(null);

  // Load admin users
  const loadAdminUsers = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      setError(null);
      const data = await fetchAdminUsers();
      setAdminUsers(data);
    } catch (err: any) {
      console.error('Error loading admin users:', err);
      setError(err.message || 'Failed to load admin users');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, []);

  // Load permissions
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, permissions: true }));
      setError(null);
      const data = await fetchPermissions();
      setPermissions(data);
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }));
    }
  }, []);

  // Load admin logs
  const loadAdminLogs = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, logs: true }));
      setError(null);
      const data = await fetchAdminLogs();
      setAdminLogs(data);
    } catch (err: any) {
      console.error('Error loading admin logs:', err);
      setError(err.message || 'Failed to load admin logs');
    } finally {
      setLoading(prev => ({ ...prev, logs: false }));
    }
  }, []);

  // Load admin stats
  const loadAdminStats = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      setError(null);
      const data = await fetchAdminStats();
      setAdminStats(data);
    } catch (err: any) {
      console.error('Error loading admin stats:', err);
      setError(err.message || 'Failed to load admin stats');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadAdminUsers(),
      loadPermissions(),
      loadAdminLogs(),
      loadAdminStats()
    ]);
  }, [loadAdminUsers, loadPermissions, loadAdminLogs, loadAdminStats]);

  // Initial data loading
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Create admin user
  const handleCreateAdmin = async (adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>, password: string) => {
    try {
      setError(null);
      const newAdmin = await createAdminUser(adminData, password);
      setAdminUsers(prev => [newAdmin, ...prev]);
      await loadAdminStats(); // Refresh stats after creation
      await loadAdminLogs(); // Refresh logs to show the creation
      return newAdmin;
    } catch (err: any) {
      console.error('Error creating admin user:', err);
      setError(err.message || 'Failed to create admin user');
      throw err;
    }
  };

  // Update admin user
  const handleUpdateAdmin = async (id: string, updates: Partial<AdminUser>) => {
    try {
      setError(null);
      const updatedAdmin = await updateAdminUser(id, updates);
      setAdminUsers(prev => 
        prev.map(admin => admin.id === id ? updatedAdmin : admin)
      );
      await loadAdminStats(); // Refresh stats after update
      await loadAdminLogs(); // Refresh logs to show the update
      return updatedAdmin;
    } catch (err: any) {
      console.error('Error updating admin user:', err);
      setError(err.message || 'Failed to update admin user');
      throw err;
    }
  };

  // Reset admin password
  const handleResetPassword = async (id: string, newPassword: string) => {
    try {
      setError(null);
      await resetAdminPassword(id, newPassword);
      await loadAdminLogs(); // Refresh logs to show the password reset
    } catch (err: any) {
      console.error('Error resetting admin password:', err);
      setError(err.message || 'Failed to reset admin password');
      throw err;
    }
  };

  // Delete admin user
  const handleDeleteAdmin = async (id: string) => {
    try {
      setError(null);
      await deleteAdminUser(id);
      setAdminUsers(prev => prev.filter(admin => admin.id !== id));
      await loadAdminStats(); // Refresh stats after deletion
      await loadAdminLogs(); // Refresh logs to show the deletion
    } catch (err: any) {
      console.error('Error deleting admin user:', err);
      setError(err.message || 'Failed to delete admin user');
      throw err;
    }
  };

  return {
    adminUsers,
    permissions,
    adminLogs,
    adminStats,
    loading,
    error,
    createAdmin: handleCreateAdmin,
    updateAdmin: handleUpdateAdmin,
    resetPassword: handleResetPassword,
    deleteAdmin: handleDeleteAdmin,
    refreshData: loadAllData,
    refreshUsers: loadAdminUsers,
    refreshPermissions: loadPermissions,
    refreshLogs: loadAdminLogs,
    refreshStats: loadAdminStats
  };
} 