import { useState, useEffect } from 'react';
import { ArrowLeft, User as UserIcon, Mail, Phone, CreditCard, GraduationCap, Save, Loader2, Lock, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ProfilePhotoUpload } from '../components/profile/ProfilePhotoUpload';
import { updateUserProfile, changePassword, getUserProfile } from '../services/profile.service';
import type { User } from '../types/auth';

export function ProfilePage() {
  const { user: authUser, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(authUser);
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState(authUser?.name || '');
  const [phone, setPhone] = useState(authUser?.phone || '');
  const [studentId, setStudentId] = useState(authUser?.studentId || '');
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/auth');
    }
  }, [authUser, authLoading, navigate]);

  useEffect(() => {
    if (authUser) {
      loadUserProfile();
    }
  }, [authUser]);

  const loadUserProfile = async () => {
    if (!authUser?.id) return;
    
    setIsLoading(true);
    try {
      const userData = await getUserProfile(authUser.id);
      setUser(userData);
      setName(userData.name || '');
      setPhone(userData.phone || '');
      setStudentId(userData.studentId || '');
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpdate = async (photoUrl: string | null) => {
    if (!user?.id) return;
    
    try {
      await updateUserProfile(user.id, { avatar: photoUrl });
      setUser({ ...user, avatar: photoUrl || undefined });
      
      // Refresh auth context
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('Profile photo updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate inputs
      if (!name.trim()) {
        throw new Error('Name is required');
      }

      const updatedUser = await updateUserProfile(user.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        studentId: studentId.trim() || undefined
      });

      setUser(updatedUser);
      
      // Refresh auth context
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate passwords
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      setIsSaving(true);
      await changePassword(newPassword);

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading only while checking authentication
  if (authLoading || (!user && authUser)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // If no user after loading, return null (will redirect via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-8">
      {/* Header removed as requested */}

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 safe-area-bottom">
        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm sm:text-base animate-fade-in">
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm sm:text-base animate-fade-in">
            {error}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Profile Photo Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Profile Photo
            </h2>
            <ProfilePhotoUpload
              userId={user.id}
              currentPhotoUrl={user.avatar}
              onPhotoUpdate={handlePhotoUpdate}
              userName={user.name}
            />
          </div>

          {/* Personal Information */}
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Personal Information
            </h2>

            <div className="space-y-4 sm:space-y-5">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <UserIcon className="w-4 h-4" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 sm:px-4 py-2.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm sm:text-base"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Email cannot be changed
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Student ID */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  <CreditCard className="w-4 h-4" />
                  Student ID
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Enter your student ID"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors touch-manipulation shadow-sm text-sm sm:text-base"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Academic Information (Read-only) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Academic Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Department</label>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium break-words">
                  {user.departmentName || 'Not assigned'}
                </p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Batch</label>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium break-words">
                  {user.batchName || 'Not assigned'}
                </p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Section</label>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium break-words">
                  {user.sectionName || 'Not assigned'}
                </p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Role
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 capitalize">
                  {user.role.replace('-', ' ')}
                </span>
              </div>
            </div>

            <p className="mt-4 sm:mt-6 text-xs text-gray-500 dark:text-gray-400">
              Contact your administrator to update academic information
            </p>
          </div>

          {/* Password Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password & Security
              </h2>
              {!showPasswordSection && (
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium self-start sm:self-auto px-3 py-1.5 -ml-3 sm:ml-0 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Change Password
                </button>
              )}
            </div>

            {showPasswordSection ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 block">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 block">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 sm:px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors text-gray-900 dark:text-white text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors touch-manipulation shadow-sm text-sm sm:text-base"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Password must be at least 6 characters long
                </p>
              </form>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep your account secure by using a strong password
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
