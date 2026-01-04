import { useState, useEffect, useCallback } from 'react';
import { 
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  deleteAdminUser,
  promoteUserToAdmin,
  promoteUserToSectionAdmin,
  demoteUser,
  fetchSectionUsers,
  fetchSections
} from '../services/admin.service';
import { AdminUser } from '../types/admin';

interface UseAdminUsersReturn {
  admins: AdminUser[];
  loading: boolean;
  error: string | null;
  createAdmin: (admin: Omit<AdminUser, 'id'>) => Promise<AdminUser>;
  updateAdmin: (id: string, admin: Partial<AdminUser>) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<boolean>;
  promoteToAdmin: (id: string) => Promise<void>;
  promoteToSectionAdmin: (id: string) => Promise<void>;
  demoteUser: (id: string) => Promise<void>;
  getSectionUsers: (sectionId: string) => Promise<AdminUser[]>;
  getSections: (batchId?: string, departmentId?: string) => Promise<any[]>;
  refreshAdmins: () => Promise<void>;
}

/**
 * Hook for managing admin users
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch admin users
  const fetchAdminList = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch real data from the admin service
      const adminUsers = await fetchAdminUsers();
      setAdmins(adminUsers);
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      setError(err.message || 'Failed to fetch admin users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load admins on mount
  useEffect(() => {
    fetchAdminList();
  }, [fetchAdminList]);

  // Create admin user
  const createAdmin = async (adminData: Omit<AdminUser, 'id'>): Promise<AdminUser> => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate a random password for the new admin
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!1";
      
      // Create the admin user through the service
      const newAdmin = await createAdminUser(adminData, password);
      
      // Refresh the admin list
      await fetchAdminList();
      
      return newAdmin;
    } catch (err: any) {
      console.error('Error creating admin user:', err);
      setError(err.message || 'Failed to create admin user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update admin user
  const updateAdmin = async (id: string, adminData: Partial<AdminUser>): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Update the admin user through the service
      await updateAdminUser(id, adminData);
      
      // Refresh the admin list
      await fetchAdminList();
    } catch (err: any) {
      console.error('Error updating admin user:', err);
      setError(err.message || 'Failed to update admin user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete admin user
  const deleteAdmin = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Delete the admin user through the service
      await deleteAdminUser(id);
      
      // Refresh the admin list
      await fetchAdminList();
    } catch (err: any) {
      console.error('Error deleting admin user:', err);
      setError(err.message || 'Failed to delete admin user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset admin password
  const resetPassword = async (id: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Reset the admin password through the service
      const result = await resetAdminPassword(id, newPassword);
      
      // Refresh the admin list
      await fetchAdminList();
      
      return result;
    } catch (err: any) {
      console.error('Error resetting admin password:', err);
      setError(err.message || 'Failed to reset admin password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Promote user to admin
  const promoteToAdmin = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Promote the user to admin through the service
      await promoteUserToAdmin(id);
      
      // Refresh the admin list
      await fetchAdminList();
    } catch (err: any) {
      console.error('Error promoting user to admin:', err);
      setError(err.message || 'Failed to promote user to admin');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Promote user to section admin
  const promoteToSectionAdmin = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to promote user ${id} to section admin`);
      
      // Check if user has a section assigned
      const userToPromote = admins.find(admin => admin.id === id);
      if (!userToPromote) {
        throw new Error('User not found');
      }
      
      if (!userToPromote.sectionId) {
        throw new Error('User does not have a section assigned. Please assign a section first.');
      }
      
      // Promote the user to section admin through the service
      await promoteUserToSectionAdmin(id);
      
      console.log(`Successfully promoted user ${id} to section admin`);
      
      // Refresh the admin list
      await fetchAdminList();
    } catch (err: any) {
      console.error('Error promoting user to section admin:', err);
      setError(err.message || 'Failed to promote user to section admin');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Demote user (remove admin privileges)
  const demoteUserFunc = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to demote user ${id}`);
      
      // Check if trying to demote super admin
      const userToDemote = admins.find(admin => admin.id === id);
      if (!userToDemote) {
        throw new Error('User not found');
      }
      
      if (userToDemote.role === 'super-admin') {
        throw new Error('Super admins cannot be demoted through this interface');
      }
      
      // Demote the user through the service
      await demoteUser(id);
      
      console.log(`Successfully demoted user ${id}`);
      
      // Refresh the admin list
      await fetchAdminList();
    } catch (err: any) {
      console.error('Error demoting user:', err);
      setError(err.message || 'Failed to demote user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get users from a specific section
  const getSectionUsers = async (sectionId: string): Promise<AdminUser[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch section users through the service
      const result = await fetchSectionUsers(sectionId);
      
      console.log('getSectionUsers result:', result);
      
      // Since fetchSectionUsers directly returns an array of AdminUser objects
      return result;
    } catch (err: any) {
      console.error('Error fetching section users:', err);
      setError(err.message || 'Failed to fetch section users');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get sections (optionally filtered by batch or department)
  const getSections = async (batchId?: string, departmentId?: string): Promise<any[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch sections through the service
      const sections = await fetchSections(batchId, departmentId);
      return sections;
    } catch (err: any) {
      console.error('Error fetching sections:', err);
      setError(err.message || 'Failed to fetch sections');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    admins, 
    loading, 
    error,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    resetPassword,
    promoteToAdmin,
    promoteToSectionAdmin,
    demoteUser: demoteUserFunc,
    getSectionUsers,
    getSections,
    refreshAdmins: fetchAdminList
  };
} 