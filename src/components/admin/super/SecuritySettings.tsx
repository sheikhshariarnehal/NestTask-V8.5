import React, { useState } from 'react';
import { 
  Key, Eye, EyeOff, RefreshCw, Shield, Copy, Check, AlertTriangle
} from 'lucide-react';
import { AdminUser } from '../../../types/admin';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';

interface SecuritySettingsProps {
  admins: AdminUser[];
  onResetPassword: (id: string, newPassword: string) => Promise<boolean>;
}

export function SecuritySettings({ 
  admins,
  onResetPassword
}: SecuritySettingsProps) {
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let newPassword = "";
    
    // Ensure at least one character from each category
    newPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    newPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    newPassword += "0123456789"[Math.floor(Math.random() * 10)];
    newPassword += "!@#$%^&*()_+"[Math.floor(Math.random() * 12)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      newPassword += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(newPassword);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(password)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        showErrorToast('Failed to copy password to clipboard');
      });
  };
  
  const handleResetPassword = async () => {
    if (!selectedAdmin) {
      showErrorToast('Please select an admin');
      return;
    }
    
    if (!password || password.length < 8) {
      showErrorToast('Please generate a secure password');
      return;
    }
    
    setIsResetting(true);
    try {
      const success = await onResetPassword(selectedAdmin, password);
      if (success) {
        showSuccessToast('Password reset successfully');
        setSelectedAdmin('');
        setPassword('');
      } else {
        showErrorToast('Failed to reset password');
      }
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Security Settings
          </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage security settings and reset passwords
          </p>
        </div>
        
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Password Reset
        </h3>
        
        <div className="space-y-4">
              <div>
            <label htmlFor="admin-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select User
                </label>
            <select
              id="admin-select"
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a user</option>
              {admins
                .filter(admin => admin.role !== 'super-admin') // Skip super admins
                .map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.username} ({admin.email}) - {admin.role}
                  </option>
                ))
              }
            </select>
              </div>
              
              <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
                </label>
            <div className="relative">
              <div className="flex">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Generate a secure password"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="bg-gray-100 dark:bg-gray-600 border-y border-r border-gray-300 dark:border-gray-600 rounded-r-lg px-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={generatePassword}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Key className="h-4 w-4" />
              <span>Generate Password</span>
            </button>
            
            {password && (
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
              </div>
              
          <div className="mt-6">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!selectedAdmin || !password || isResetting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-red-300 dark:disabled:bg-red-800/50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <span>Reset Password</span>
            </button>
              </div>
              
          {selectedAdmin && password && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg flex items-start gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Important:</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  You are about to reset the password for this user. Make sure to share the new password with them securely. They should change their password after logging in.
                </p>
              </div>
            </div>
          )}
              </div>
            </div>
            
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Security Policies
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Two-factor Authentication</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Require 2FA for all admin accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
          <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Password Expiry</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Force password change every 90 days</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Session Timeout</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto logout after 30 minutes of inactivity</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Failed Login Lockout</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lock account after 5 failed login attempts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-6">
            <button
              type="button"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Save Security Settings</span>
            </button>
        </div>
      </div>
    </div>
  );
} 
