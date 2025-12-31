import React, { useState } from 'react';
import { UserPlus, Key, Eye, EyeOff, Save, X, CheckCircle } from 'lucide-react';
import type { AdminUser, AdminPermission } from '../../../types/admin';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';

interface AdminCreateProps {
  permissions: AdminPermission[];
  loading: boolean;
  onCreate: (adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>, password: string) => Promise<AdminUser | undefined>;
}

export function AdminCreate({ permissions, loading, onCreate }: AdminCreateProps) {
  const [formData, setFormData] = useState<Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>>({
    username: '',
    email: '',
    role: 'admin',
    status: 'active',
    permissions: []
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const availablePermissions = [
    'user_manage', 'user_view', 
    'task_manage', 'task_view',
    'course_manage', 'course_view',
    'announcement_manage', 'announcement_view',
    'teacher_manage', 'teacher_view',
    'routine_manage', 'routine_view',
    'study_material_manage', 'study_material_view'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
    
    // Clear confirm password error if it becomes matching
    if (errors.confirmPassword && e.target.value === confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };
  
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    
    // Clear confirm password error if it becomes matching
    if (errors.confirmPassword && e.target.value === password) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };
  
  const handlePermissionChange = (permission: string) => {
    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      return {
        ...prev,
        permissions: currentPermissions.includes(permission)
          ? currentPermissions.filter(p => p !== permission)
          : [...currentPermissions, permission]
      };
    });
  };
  
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()-_=+';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true);
    
    if (errors.password || errors.confirmPassword) {
      setErrors(prev => ({ ...prev, password: '', confirmPassword: '' }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const result = await onCreate(formData, password);
      
      if (result) {
        setSuccess(true);
        setFormData({
          username: '',
          email: '',
          role: 'admin',
          status: 'active',
          permissions: []
        });
        setPassword('');
        setConfirmPassword('');
        showSuccessToast('Admin user created successfully');
      }
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to create admin user');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      role: 'admin',
      status: 'active',
      permissions: []
    });
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setSuccess(false);
  };

  return (
    <div className="bg-white dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <div className="mb-5 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Create New Admin User
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          Create a new admin account with specific permissions and access levels.
        </p>
      </div>
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800 dark:text-green-300">Admin User Created Successfully</h3>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              The admin user has been created and can now log in using the provided credentials.
            </p>
            <button
              onClick={resetForm}
              className="mt-2 text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
            >
              Create Another Admin
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.username ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter admin username"
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
            )}
          </div>
          
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter admin email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>
          
          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isSubmitting}
            >
              <option value="admin">Admin</option>
              <option value="super-admin">Super Admin</option>
            </select>
          </div>
          
          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department (Optional)
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter department"
              disabled={isSubmitting}
            />
          </div>
          
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.password ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
            )}
          </div>
          
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.confirmPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Confirm password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
        
        {/* Password Generator */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={generateRandomPassword}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
          >
            <Key className="w-4 h-4 mr-2" />
            Generate Strong Password
          </button>
        </div>
        
        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Permissions
          </label>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availablePermissions.map(permission => (
                <div key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`permission-${permission}`}
                    checked={(formData.permissions || []).includes(permission)}
                    onChange={() => handlePermissionChange(permission)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    disabled={isSubmitting}
                  />
                  <label 
                    htmlFor={`permission-${permission}`}
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {permission.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="status"
                value="active"
                checked={formData.status === 'active'}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                disabled={isSubmitting}
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="status"
                value="disabled"
                checked={formData.status === 'disabled'}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                disabled={isSubmitting}
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Disabled</span>
            </label>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow flex items-center ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">Creating...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Create Admin User
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 