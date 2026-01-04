import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { useTasks } from '../../hooks/useTasks';
import { SideNavigation } from '../../components/admin/navigation/SideNavigation';
import { AlertTriangle, Plus } from 'lucide-react';
import type { AdminTab } from '../../types/admin';
import { LoadingScreen } from '../../components/LoadingScreen';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const [error] = useState<string | null>(null);
  const [openTaskFormV2, setOpenTaskFormV2] = useState(false);

  // Load users and tasks data
  const { users, deleteUser, refreshUsers, loading: usersLoading } = useUsers();
  const { tasks, createTask, updateTask, deleteTask, refreshTasks, loading: tasksLoading } = useTasks(user?.id);

  // Determine if user is section admin
  const isSectionAdmin = user?.role === 'section_admin';
  const sectionId = user?.sectionId;
  const sectionName = user?.sectionName;

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
    if (path.includes('/admin/super-admin')) return 'super-admin';
    return 'dashboard';
  };

  const activeTab = getCurrentTab();

  // Handle tab navigation
  const handleTabChange = useCallback((tab: AdminTab) => {
    const routes: Record<AdminTab, string> = {
      'dashboard': '/admin/dashboard',
      'users': '/admin/users',
      'tasks': '/admin/tasks',
      'task-management-v2': '/admin/task-management',
      'announcements': '/admin/announcements',
      'lecture-slides': '/admin/lecture-slides',
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
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <div className="h-full overflow-y-auto">
          <div className="h-full p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
            {/* Header */}
            <header className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {isSectionAdmin ? `${sectionName} Admin` : 'Admin Dashboard'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage your application
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </header>

            {error && (
              <div className="mb-4 p-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {/* Render child routes */}
              <Outlet context={{ 
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
              }} />
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
}
