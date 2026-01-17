import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, ListTodo, Settings, LogOut, Megaphone, Moon, Sun,
  Book, GraduationCap, FileText, CalendarDays, User, LayoutDashboard,
  BarChart2, Bell, HelpCircle, Globe, AlertCircle, ChevronLeft,
  MessageCircle, Search, CheckCircle, Clock, Plus, UserCog
} from 'lucide-react';
import { SideNavLink } from './SideNavLink';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';
import type { AdminTab } from '../../../types/admin';

interface SideNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  onCollapse?: (collapsed: boolean) => void;
  isSectionAdmin?: boolean;
  onCreateTask?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SideNavigation = React.memo(function SideNavigation({
  activeTab,
  onTabChange,
  onLogout,
  onCollapse,
  isSectionAdmin = false,
  onCreateTask,
  isOpen,
  onClose
}: SideNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDark, toggle } = useTheme();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close mobile menu when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onClose]);


  useEffect(() => {
    // Update time only once per minute to reduce re-renders
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute instead of continuous
    return () => clearInterval(interval);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Memoize navigation items to prevent rerenders
  const mainNavItems = useMemo(() => [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users' as const, label: 'Users', icon: Users, badge: 147 },
    { id: 'tasks' as const, label: 'Tasks (Legacy)', icon: ListTodo, badge: 56 },
    { id: 'task-management-v2' as const, label: 'Task Management', icon: CheckCircle, badge: null },
  ], []);

  // Full list of management items
  const allManagementItems = useMemo(() => [
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
    { id: 'lecture-slides' as const, label: 'Lecture Slides', icon: FileText },
    { id: 'fcm-management' as const, label: 'Push Notifications', icon: Bell }
  ], []);

  // Section admin can manage announcements, lecture slides, and FCM tokens
  const managementNavItems = useMemo(() => {
    if (isSectionAdmin) {
      return allManagementItems.filter(item =>
        ['announcements', 'lecture-slides', 'fcm-management'].includes(item.id)
      );
    }
    return allManagementItems;
  }, [allManagementItems, isSectionAdmin]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
    // Close profile menu when mobile menu is toggled
    setShowProfileMenu(false);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleNavigation = useCallback((tab: AdminTab) => {
    onTabChange(tab);
    onClose();
    setShowProfileMenu(false);
  }, [onTabChange, onClose]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      // Notify parent component of sidebar collapse state
      if (onCollapse) {
        onCollapse(newState);
      }
      return newState;
    });
    // Close profile menu when sidebar is collapsed/expanded
    setShowProfileMenu(false);
  }, [onCollapse]);

  const handleThemeToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  const toggleProfileMenu = useCallback(() => {
    setShowProfileMenu(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setShowProfileMenu(false);
    onLogout();
  }, [onLogout]);

  return (
    <>
      {/* Mobile Backdrop with transition */}
      <div
        className={`fixed inset-0 bg-gray-900/50 z-[25] lg:hidden backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`
        fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transform transition-all duration-300 ease-in-out z-40 shadow-2xl lg:shadow-none will-change-transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        lg:relative lg:translate-x-0
      `}>
        {/* Collapse Button - Positioned at sidebar edge */}
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-md absolute top-[32px] -right-3.5 z-50`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`h-[72px] px-4 pl-5 border-b border-gray-200 dark:border-gray-800 flex ${isCollapsed ? 'justify-center' : 'justify-start'} items-center shrink-0`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-none tracking-tight">NestTask</span>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{isSectionAdmin ? "Section Panel" : "Admin Panel"}</span>
                </div>
              </div>
            )}

            {isCollapsed && (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <Settings className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 py-4 px-3 overflow-y-auto">
            {!isCollapsed && (
              <div className="mb-3 px-2">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Main</h2>
              </div>
            )}

            <nav className="space-y-1">
              {mainNavItems.map((item) => (
                <SideNavLink
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeTab === item.id}
                  onClick={() => handleNavigation(item.id)}
                  badge={item.badge}
                  isCollapsed={isCollapsed}
                />
              ))}
            </nav>

            {!isCollapsed && (
              <div className="my-3 px-2">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Management</h2>
              </div>
            )}

            {isCollapsed && <div className="my-3 border-t border-gray-200 dark:border-gray-800 mx-2"></div>}

            <nav className="space-y-1">
              {managementNavItems.map((item) => (
                <SideNavLink
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeTab === item.id}
                  onClick={() => handleNavigation(item.id)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </nav>

            {!isCollapsed && (
              <div className="mt-6 mx-2">
                <button
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  onClick={() => {
                    if (onCreateTask) {
                      onCreateTask();
                    }
                    handleNavigation('task-management-v2');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </button>
              </div>
            )}

            {isCollapsed && (
              <div className="mt-6 flex justify-center">
                <button
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                  onClick={() => {
                    if (onCreateTask) {
                      onCreateTask();
                    }
                    handleNavigation('task-management-v2');
                  }}
                  aria-label="Create Task"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Footer with improved profile section */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 relative profile-menu-container">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleProfileMenu}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-white dark:ring-gray-800">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate w-full group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user?.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                      {user?.email || 'Loading...'}
                    </span>
                  </div>
                  <ChevronLeft className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform rotate-90 ${showProfileMenu ? 'rotate-[270deg]' : ''} group-hover:text-blue-600 dark:group-hover:text-blue-400`} />
                </button>
              </div>
            ) : (
              <button
                onClick={toggleProfileMenu}
                className="w-full flex justify-center group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-white dark:ring-gray-800 group-hover:ring-blue-200 dark:group-hover:ring-blue-900 transition-all">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
              </button>
            )}

            {/* Dropdown menu for profile actions */}
            {showProfileMenu && (
              <div className={`
                absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50
                ${isCollapsed ? 'left-full ml-2 bottom-auto top-0' : ''}
              `}>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-white dark:ring-gray-800">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || 'Loading...'}</p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleNavigation('profile' as AdminTab)}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleThemeToggle}
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => window.open('/help', '_blank')}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help Center</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
});