import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, SortAsc, SortDesc, Filter, Edit, Trash2, Shield, Key, 
  X, Check, MoreHorizontal, AlertTriangle, Plus, ArrowUpDown, Lock, ChevronLeft, ChevronRight, Download, Printer, RefreshCw,
  HelpCircle, Info
} from 'lucide-react';
import { AdminEditModal } from './AdminEditModal';
import { AdminResetPasswordModal } from './AdminResetPasswordModal';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';
import type { AdminUser } from '../../../types/admin';
import { AdminCreate } from './AdminCreate';

interface AdminManagementProps {
  admins: AdminUser[];
  loading: boolean;
  error: string | null;
  onCreateAdmin: (admin: Omit<AdminUser, 'id'>) => Promise<AdminUser>;
  onUpdateAdmin: (id: string, admin: Partial<AdminUser>) => Promise<void>;
  onDeleteAdmin: (id: string) => Promise<void>;
  onResetPassword: (id: string, newPassword: string) => Promise<boolean>;
  onPromoteToAdmin?: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

function HelpTooltip({ content }: { content: string }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 transform -translate-x-1/2 left-1/2 mt-2">
          {content}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700"></div>
        </div>
      )}
    </div>
  );
}

export function AdminManagement({ 
  admins,
  loading,
  error,
  onCreateAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onResetPassword,
  onPromoteToAdmin,
  onRefresh
}: AdminManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof AdminUser>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'super-admin' | 'user'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recentlyPromoted, setRecentlyPromoted] = useState<Record<string, boolean>>({});

  // Log admins data for debugging
  useEffect(() => {
    console.log('AdminManagement - admins data:', admins);
    console.log('AdminManagement - loading:', loading);
    console.log('AdminManagement - error:', error);
  }, [admins, loading, error]);

  // Create some sample users for testing if no users are provided
  const testUsers: AdminUser[] = useMemo(() => [
    {
      id: '1',
      username: 'Test User',
      email: 'test@example.com',
      role: 'user',
      department: 'Test Department',
      permissions: [],
      status: 'active' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      phone: '123-456-7890',
      studentId: 'TEST001'
    },
    {
      id: '2',
      username: 'Test Admin',
      email: 'admin@example.com',
      role: 'admin',
      department: 'Admin Department',
      permissions: [],
      status: 'active' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      phone: '123-456-7891',
      studentId: 'ADMIN001'
    },
    {
      id: '3',
      username: 'Test Super Admin',
      email: 'superadmin@example.com',
      role: 'super-admin',
      department: 'Super Admin Department',
      permissions: [],
      status: 'active' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      phone: '123-456-7892',
      studentId: 'SADMIN001'
    }
  ], []);

  useEffect(() => {
    if (!admins || admins.length === 0) {
      console.log('No users provided, using test users for display');
      setFilteredUsers(testUsers);
      return;
    }
    
    console.log('Filtering admins with:', { 
      statusFilter, 
      roleFilter, 
      searchTerm, 
      sortField, 
      sortDirection 
    });
    
    let filtered = [...admins];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(admin => admin.status === statusFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(admin => admin.role === roleFilter);
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        admin => 
          (admin.username || '').toLowerCase().includes(term) ||
          (admin.email || '').toLowerCase().includes(term) ||
          (admin.department || '').toLowerCase().includes(term) ||
          (admin.studentId || '').toLowerCase().includes(term) ||
          (admin.phone || '').toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const fieldA = a[sortField] || '';
      const fieldB = b[sortField] || '';
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc' 
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }
      
      return 0;
    });
    
    console.log('Filtered users result:', filtered);
    setFilteredUsers(filtered);
  }, [admins, searchTerm, sortField, sortDirection, statusFilter, roleFilter, testUsers]);

  // When admins data changes or loading finishes, update the filtered users
  useEffect(() => {
    if (!loading) {
      console.log('Loading finished, updating filtered users with:', admins);
      if (!admins || admins.length === 0) {
        console.log('No users after loading, using test users');
        setFilteredUsers(testUsers);
      } else {
        setFilteredUsers(admins || []);
      }
    }
  }, [admins, loading, testUsers]);

  const handleSort = (field: keyof AdminUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowEditModal(true);
  };

  const handleResetPasswordClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowResetPasswordModal(true);
  };

  const handleDeleteClick = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowDeleteConfirmation(true);
  };

  const handleUpdateAdmin = async (id: string, updates: Partial<AdminUser>) => {
    try {
      await onUpdateAdmin(id, updates);
      setShowEditModal(false);
      showSuccessToast('Admin user updated successfully');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update admin user');
    }
  };

  const handleResetPassword = async (id: string, newPassword: string) => {
    try {
      await onResetPassword(id, newPassword);
      setShowResetPasswordModal(false);
      showSuccessToast('Password reset successfully');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      setDeletingAdmin(selectedAdmin.id);
      await onDeleteAdmin(selectedAdmin.id);
      setShowDeleteConfirmation(false);
      setSelectedAdmin(null);
      showSuccessToast('Admin user deleted successfully');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete admin user');
    } finally {
      setDeletingAdmin(null);
    }
  };

  const handleStatusToggle = async (admin: AdminUser) => {
    try {
      const newStatus = admin.status === 'active' ? 'disabled' : 'active';
      await onUpdateAdmin(admin.id, { status: newStatus });
      showSuccessToast(`Admin ${newStatus === 'active' ? 'activated' : 'disabled'} successfully`);
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to update admin status');
    }
  };

  const handleCreateAdmin = async (adminData: Omit<AdminUser, 'id'>) => {
    try {
      await onCreateAdmin(adminData);
      setShowCreateModal(false);
      showSuccessToast('Admin user created successfully');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to create admin user');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // If we have a refreshAdmins function in props, call it
      if (onRefresh) {
        console.log('Calling onRefresh to update admin users');
        await onRefresh();
      }
      setSearchTerm('');
      setStatusFilter('all');
      setRoleFilter('all');
    } catch (err) {
      console.error('Error refreshing admins:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePromoteToAdmin = async (admin: AdminUser) => {
    if (!onPromoteToAdmin) return;
    
    try {
      await onPromoteToAdmin(admin.id);
      // Add user to recently promoted list
      setRecentlyPromoted(prev => ({ ...prev, [admin.id]: true }));
      showSuccessToast(`${admin.username} has been promoted to admin. They will need to log out and log back in for the changes to take effect.`);
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to promote user to admin');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center bg-white dark:bg-gray-750 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <div className="relative inline-block">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Role Filter */}
          <div className="relative inline-block">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="super-admin">Super Admin</option>
              <option value="user">Regular User</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:min-w-[250px]">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Create User Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Create User</span>
          </button>
          
          {/* Admin Info Help */}
          <div className="p-2 rounded-lg text-gray-600 dark:text-gray-300 transition-colors">
            <HelpTooltip content="To promote a user to admin, click the shield icon in their actions. The user will need to log out and log back in for the changes to take effect. Only super-admins can promote users." />
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            title="Refresh user list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Management Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-3 mt-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">About Role Management</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            When you promote a user to admin, the change is made to their database record. 
            They will need to <strong>log out and log back in</strong> for the changes to take effect. 
            Users with the "Relogin Required" tag have been promoted but haven't logged in again yet.
          </p>
        </div>
      </div>

      {/* Admin List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('username')}>
                  <div className="flex items-center gap-1">
                    Name
                    {sortField === 'username' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                    {sortField !== 'username' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                    {sortField !== 'email' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">
                    Role
                    {sortField === 'role' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                    {sortField !== 'role' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('department')}>
                  <div className="flex items-center gap-1">
                    Department
                    {sortField === 'department' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                    {sortField !== 'department' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                    {sortField !== 'status' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-red-500">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No users found. {searchTerm && <span>Try a different search term.</span>}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {admin.username || 'Unnamed'}
                        {recentlyPromoted[admin.id] && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                            Relogin Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{admin.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`
                        px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full
                        ${admin.role === 'super-admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
                          : admin.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {admin.role || 'User'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{admin.department || 'Unassigned'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`
                        px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full
                        ${admin.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }
                      `}>
                        {admin.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {admin.lastLogin 
                        ? new Date(admin.lastLogin).toLocaleDateString() 
                        : 'Never'
                      }
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleStatusToggle(admin)}
                          disabled={admin.role === 'super-admin'}
                          className={`
                            p-1.5 rounded-lg transition-colors
                            ${admin.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400 dark:hover:bg-green-900/20'
                            }
                            ${admin.role === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          title={admin.status === 'active' ? 'Disable account' : 'Activate account'}
                        >
                          {admin.status === 'active' ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                        
                        {admin.role === 'user' && onPromoteToAdmin && (
                          <button 
                            onClick={() => handlePromoteToAdmin(admin)}
                            className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors dark:bg-purple-900/10 dark:text-purple-400 dark:hover:bg-purple-900/20"
                            title="Promote to Admin"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}

                        <button 
                          onClick={() => handleEditClick(admin)}
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors dark:bg-blue-900/10 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleResetPasswordClick(admin)}
                          className="p-1.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors dark:bg-yellow-900/10 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                          title="Reset password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteClick(admin)}
                          disabled={admin.role === 'super-admin'}
                          className={`
                            p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20
                            ${admin.role === 'super-admin' ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedAdmin && (
        <AdminEditModal
          admin={selectedAdmin}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateAdmin}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedAdmin && (
        <AdminResetPasswordModal
          admin={selectedAdmin}
          onClose={() => setShowResetPasswordModal(false)}
          onResetPassword={handleResetPassword}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the user <span className="font-semibold">{selectedAdmin.username || selectedAdmin.email}</span>? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleDeleteAdmin}
                disabled={!!deletingAdmin}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-70"
              >
                {deletingAdmin === selectedAdmin.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <AdminCreate
          permissions={[]}
          loading={false}
          onCreate={handleCreateAdmin}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
} 