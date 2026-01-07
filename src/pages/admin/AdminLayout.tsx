import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUsers } from '../../hooks/useUsers';
import { useTasks } from '../../hooks/useTasks';
import { SideNavigation } from '../../components/admin/navigation/SideNavigation';
import { AlertTriangle, Plus, Calendar, Menu, User, LogOut, Moon, Sun, HelpCircle, UserCog } from 'lucide-react';
import type { AdminTab } from '../../types/admin';
import { LoadingScreen } from '../../components/LoadingScreen';
import React from 'react';

export const AdminLayout = React.memo(function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const [error] = useState<string | null>(null);
  const [openTaskFormV2, setOpenTaskFormV2] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load users and tasks data
  const { users, deleteUser, refreshUsers, loading: usersLoading } = useUsers();

  const { tasks, createTask, updateTask, deleteTask, refreshTasks, loading: tasksLoading } = useTasks(user?.id);

  // Determine if user is section admin
  const isSectionAdmin = user?.role === 'section_admin';
  const sectionId = user?.sectionId;
  const sectionName = user?.sectionName;

  const { isDark, toggle } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check authorization
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Check if user has admin privileges
    const isAdmin = user.role === 'admin' || user.role === 'super-admin' || user.role === 'section_admin';
    if (!isAdmin) {
      navigate('/', { replace: true });
      return;
    }

    // Redirect super-admin to their dashboard (only for base /admin path)
    if (user.role === 'super-admin') {
      if (location.pathname === '/admin' || location.pathname === '/admin/') {
        navigate('/superadmin/dashboard', { replace: true });
        return;
      }
    }

    // Redirect other admins to dashboard if on base /admin path
    if ((user.role === 'admin' || user.role === 'section_admin') && 
        (location.pathname === '/admin' || location.pathname === '/admin/')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate, location.pathname, authLoading]);

  // Get current active tab from URL
  const getCurrentTab = (): AdminTab => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/tasks')) return 'tasks';
    if (path.includes('/admin/task-management')) return 'task-management-v2';
    if (path.includes('/admin/announcements')) return 'announcements';
    if (path.includes('/admin/lecture-slides')) return 'lecture-slides';
    if (path.includes('/admin/fcm-management')) return 'fcm-management';
    if (path.includes('/admin/super-admin')) return 'super-admin';
    return 'dashboard';
  };

  const activeTab = useMemo(() => getCurrentTab(), [location.pathname]);

  // Memoize formatted date
  const formattedDate = useMemo(() => 
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 
    []
  );

  // Memoize outlet context
  const outletContext = useMemo(() => ({ 
    users, 
    tasks, 
    isSectionAdmin, 
    sectionId, 
    sectionName,
    deleteUser,
    refreshUsers,
    refreshTasks,
    onCreateTask: createTask,
    onDeleteTask: deleteTask,
    onUpdateTask: updateTask,
    openTaskFormV2,
    setOpenTaskFormV2,
    usersLoading,
    tasksLoading
  }), [users, tasks, isSectionAdmin, sectionId, sectionName, deleteUser, refreshUsers, refreshTasks, createTask, deleteTask, updateTask, openTaskFormV2, setOpenTaskFormV2, usersLoading, tasksLoading]);

  // Handle tab navigation
  const handleTabChange = useCallback((tab: AdminTab) => {
    const routes: Record<AdminTab, string> = {
      'dashboard': '/admin/dashboard',
      'users': '/admin/users',
      'tasks': '/admin/tasks',
      'task-management-v2': '/admin/task-management',
      'announcements': '/admin/announcements',
      'lecture-slides': '/admin/lecture-slides',
      'fcm-management': '/admin/fcm-management',
      'super-admin': '/admin/super-admin'
    };
    
    navigate(routes[tab]);
  }, [navigate]);

  // Handle create task FAB
  const handleCreateTask = useCallback(() => {
    navigate('/admin/task-management');
    setTimeout(() => {
      setOpenTaskFormV2(true);
    }, 150);
  }, [navigate]);

  // Show loading screen while checking auth
  if (!user || (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'section_admin')) {
    return <LoadingScreen minimumLoadTime={300} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Side Navigation */}
      <SideNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={logout}
        isSectionAdmin={isSectionAdmin}
        onCreateTask={handleCreateTask}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0 bg-gray-50 dark:bg-gray-900">
        <div className="h-full overflow-y-auto">
          {/* Professional Sticky Header - Fully Responsive */}
          <header 
            className="h-[72px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-8 sticky top-0 z-20 flex items-center justify-between gap-4 transition-all duration-200 ease-in-out"
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 overflow-hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden -ml-2 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Open sidebar"
                >
                  <Menu className="w-6 h-6" />
                </button>

                <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white leading-none tracking-tight truncate">
                  {activeTab === 'dashboard' && 'Overview'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'tasks' && 'Legacy Tasks'}
                  {activeTab === 'task-management-v2' && 'Task Management'}
                  {activeTab === 'announcements' && 'Announcements'}
                  {activeTab === 'lecture-slides' && 'Lecture Slides'}
                  {activeTab === 'super-admin' && 'Super Admin'}
                </h1>
            </div>
  
            <div className="flex items-center gap-4">
              <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-gray-800 mx-2" />
              
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col items-end mr-1">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                     <Calendar className="w-3 h-3" />
                     <span>Today</span>
                   </div>
                   <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                     {formattedDate}
                   </span>
                </div>
    
                <div className="relative" ref={profileMenuRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
                    >
                        <div className="flex flex-col items-end hidden md:flex">
                             <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {user?.name?.split(' ')[0] || 'User'}
                             </span>
                             <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                {user?.role?.replace('_', ' ') || 'Admin'}
                             </span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-white dark:ring-gray-800 group-hover:ring-blue-100 dark:group-hover:ring-blue-900 transition-all">
                             {user?.avatar ? (
                                 <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                             ) : (
                                 <User className="w-4 h-4 text-white" />
                             )}
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 transform origin-top-right transition-all">
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>

                            <div className="py-1">
                              <button
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                onClick={() => {
                                    handleTabChange('users'); // Or profile page if exists
                                    setShowProfileMenu(false);
                                }}
                              >
                                <UserCog className="w-4 h-4 text-gray-400" />
                                <span>Profile Settings</span>
                              </button>

                              <button
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                onClick={toggle}
                              >
                                {isDark ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
                                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                              </button>
                                
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                              <button
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    logout();
                                }}
                              >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                              </button>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
            {error && (
              <div className="mb-4 p-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {/* Render child routes */}
              <Outlet context={outletContext} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile FAB - Create Task */}
      <button
        onClick={handleCreateTask}
        className="lg:hidden fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 active:scale-95"
        aria-label="Create Task"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
});
