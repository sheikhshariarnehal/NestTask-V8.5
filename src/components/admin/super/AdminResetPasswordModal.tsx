import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import type { AdminUser } from '../../../types/admin';

interface AdminResetPasswordModalProps {
  admin: AdminUser;
  onClose: () => void;
  onResetPassword: (id: string, newPassword: string) => Promise<void>;
}

export function AdminResetPasswordModal({ 
  admin, 
  onClose, 
  onResetPassword 
}: AdminResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  
  // Generate a random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()-_=+';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  
  const handleGeneratePassword = () => {
    const password = generateRandomPassword();
    setNewPassword(password);
    setConfirmPassword(password);
    setGeneratedPassword(password);
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (newPassword !== confirmPassword) {
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
      await onResetPassword(admin.id, newPassword);
    } catch (err) {
      console.error('Error resetting password:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-5">
          You are resetting the password for <span className="font-medium text-gray-900 dark:text-white">{admin.username}</span> ({admin.email}).
        </p>
        
        {generatedPassword && (
          <div className="mb-5 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Generated Password</p>
            <div className="flex items-center justify-between">
              <code className="text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-800/30 px-2 py-1 rounded font-mono">{generatedPassword}</code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  // Optional: add a toast notification for copy confirmation
                }}
                className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) {
                    setErrors({ ...errors, newPassword: '' });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.newPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
            )}
          </div>
          
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: '' });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.confirmPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Confirm new password"
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
          
          {/* Generate Password Button */}
          <div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              <Key className="w-4 h-4 mr-2" />
              Generate Strong Password
            </button>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            Note: The admin will need to use this new password for their next login. Consider notifying them securely about the password change.
          </p>
        </form>
      </div>
    </div>
  );
} 