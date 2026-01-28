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
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: Shield,
      description: 'System Management',
      onClick: () => console.log('Admin clicked')
    }] : [])
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
        className="
          relative flex items-center justify-center 
          w-10 h-10 sm:w-11 sm:h-11
          rounded-full
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
          active:scale-95
          hover:ring-2 hover:ring-blue-400/30 dark:hover:ring-blue-500/30
        "
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user?.avatar && !imageError ? (
          <img 
            src={avatarUrl || user.avatar} 
            alt={user.name} 
            onError={() => setImageError(true)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow-lg"
          />
        ) : (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-lg ring-2 ring-gray-200 dark:ring-gray-700">
            {userInitial}
          </div>
        )}
        {/* Online indicator with pulse animation */}
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-[2.5px] border-white dark:border-gray-900 shadow-md">
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10 bg-transparent"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div 
            className="
              absolute right-0 left-auto
              mt-3
              w-[calc(100vw-1.5rem)] xs:w-[300px] sm:w-[320px] md:w-[340px] 
              max-h-[calc(100vh-120px)] overflow-y-auto
              bg-white dark:bg-gray-800 
              rounded-2xl shadow-2xl shadow-gray-900/10 dark:shadow-gray-900/40
              ring-1 ring-gray-200/50 dark:ring-gray-700/50 
              z-20 
              animate-scale-in origin-top-right
            "
            style={{
              maxWidth: 'calc(100vw - 1.5rem)',
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Profile Section */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/80 dark:to-gray-800/50 rounded-t-2xl">
              <div className="flex items-center gap-4">
                {user?.avatar && !imageError ? (
                  <img 
                    src={avatarUrl || user.avatar} 
                    alt={user.name} 
                    onError={() => setImageError(true)}
                    className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-gray-700 ring-1 ring-gray-200/50 dark:ring-gray-600/50"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg text-xl font-bold border-2 border-white dark:border-gray-700">
                    {userInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">{user?.name || 'User'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email || 'user@example.com'}</p>
                  <span className="inline-flex items-center mt-2 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize shadow-sm">
                    {user?.role || 'user'}
                  </span>
                </div>
              </div>
              
              {/* Department, Batch, Section info */}
              {(departmentName || batchName || sectionName) && (
                <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2.5">
                  {departmentName && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{departmentName}</span>
                    </div>
                  )}
                  
                  {batchName && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{batchName}</span>
                    </div>
                  )}
                  
                  {sectionName && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">  
                        <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{sectionName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu Items - Enhanced touch targets */}
            <div className="p-2 sm:p-3 border-t border-gray-100 dark:border-gray-700/50">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="
                    w-full flex items-center gap-3 p-3 sm:p-3.5 
                    rounded-xl 
                    hover:bg-gray-100 dark:hover:bg-gray-700/60 
                    active:scale-[0.98] active:bg-gray-100 dark:active:bg-gray-700
                    transition-all duration-150 
                    group
                  "
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  role="menuitem"
                >
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shadow-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-grow text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {item.label}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{item.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-0.5 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Logout Section - Enhanced */}
            <div className="p-2 sm:p-3 border-t border-gray-100 dark:border-gray-700/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="
                  w-full flex items-center gap-3 p-3 sm:p-3.5 
                  text-red-600 dark:text-red-400 
                  hover:bg-red-50 dark:hover:bg-red-900/20 
                  active:scale-[0.98] active:bg-red-100 dark:active:bg-red-900/30
                  rounded-xl transition-all duration-150 
                  group
                "
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                role="menuitem"
              >
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors shadow-sm flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-grow text-left min-w-0">
                  <div className="font-medium text-sm sm:text-base truncate">Sign Out</div>
                  <div className="text-xs sm:text-sm text-red-500/80 dark:text-red-400/80 truncate">End your session securely</div>
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