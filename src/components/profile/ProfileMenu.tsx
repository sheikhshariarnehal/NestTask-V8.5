import { useState, useEffect, useMemo } from 'react';
import { User, LogOut, Code, Settings, ChevronRight, Shield, BookOpen, Users, Layers, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getDepartmentById, getBatchById, getSectionById } from '../../services/department.service';
import { DeveloperModal } from './DeveloperModal';
import { SettingsModal } from '../settings/SettingsModal';
import { useNavigate } from 'react-router-dom';

interface ProfileMenuProps {
  onLogout: () => void;
}

export function ProfileMenu({ onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Get department, batch, and section names from user object (already loaded by useAuth)
  // These come from users_with_full_info view, eliminating 3 separate queries
  const departmentName = (user as any)?.departmentName || null;
  const batchName = (user as any)?.batchName || null;
  const sectionName = (user as any)?.sectionName || null;

  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: UserCircle,
      description: 'View & Edit Profile',
      onClick: () => {
        setIsOpen(false);
        navigate('/profile');
      }
    },
    {
      id: 'developer',
      label: 'Developer',
      icon: Code,
      description: 'API Access & Documentation',
      onClick: () => {
        setIsOpen(false);
        setShowDeveloperModal(true);
      }
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Preferences & Security',
      onClick: () => {
        setIsOpen(false);
        setShowSettingsModal(true);
      }
    },
    ...(['admin', 'super-admin', 'section_admin'].includes(user?.role || '') ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: Shield,
      description: 'System Management',
      onClick: () => {
        setIsOpen(false);
        navigate('/admin/dashboard');
      }
    }] : []),
    {
      id: 'lecture-slides',
      label: 'Lecture Slides',
      icon: BookOpen,
      description: 'Course Materials',
      onClick: () => {
        setIsOpen(false);
        navigate('/lecture-slides');
      }
    },
    {
      id: 'routine',
      label: 'Academic Routine',
      icon: Layers,
      description: 'Class Schedule',
      onClick: () => {
        setIsOpen(false);
        navigate('/routine');
      }
    }
  ];

  const userInitial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';
  const [imageError, setImageError] = useState(false);
  
  // Use a stable timestamp for cache busting that only updates when the avatar URL actually changes
  // This prevents the image from flickering/reloading on every render
  const avatarUrl = useMemo(() => {
    if (!user?.avatar) return null;
    return `${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }, [user?.avatar]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/50 active:scale-95 transition-transform"
        aria-label="Open profile menu"
      >
        {user?.avatar && !imageError ? (
          <img 
            src={avatarUrl || user.avatar} 
            alt={user.name} 
            onError={() => setImageError(true)}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
          />
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs sm:text-sm font-semibold shadow-sm border-2 border-white dark:border-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
            {userInitial}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="
            absolute right-0 sm:-right-2 md:right-0 
            mt-2 
            w-[calc(100vw-2rem)] xs:w-[280px] sm:w-[300px] md:w-[320px] 
            max-h-[calc(100vh-80px)] overflow-y-auto
            bg-white dark:bg-gray-800 
            rounded-xl shadow-xl 
            ring-1 ring-black/5 dark:ring-white/5 
            z-20 
            animate-scale-in origin-top-right 
            divide-y divide-gray-100 dark:divide-gray-700
          ">
            {/* Profile Section */}
            <div className="p-3 xs:p-4 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                {user?.avatar && !imageError ? (
                  <img 
                    src={avatarUrl || user.avatar} 
                    alt={user.name} 
                    onError={() => setImageError(true)}
                    className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-800 ring-1 ring-gray-200 dark:ring-gray-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm text-xl font-bold border-2 border-white dark:border-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                    {userInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{user?.name || 'User'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {user?.role || 'user'}
                  </span>
                </div>
              </div>
              
              {/* Department, Batch, Section info */}
              {(departmentName || batchName || sectionName) && (
                <div className="mt-3.5 pt-3.5 border-t border-gray-100 dark:border-gray-700 space-y-2.5">
                  {departmentName && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">{departmentName}</span>
                    </div>
                  )}
                  
                  {batchName && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">{batchName}</span>
                    </div>
                  )}
                  
                  {sectionName && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-900/20">  
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-300">{sectionName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-grow text-left">
                    <div className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors opacity-70 group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {/* Logout Section */}
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <div className="flex-grow text-left">
                  <div className="font-medium text-sm">Logout</div>
                  <div className="text-xs text-red-500 dark:text-red-400">End your session</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {showDeveloperModal && (
        <DeveloperModal onClose={() => setShowDeveloperModal(false)} />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}