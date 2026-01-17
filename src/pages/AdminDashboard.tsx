import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef, memo } from 'react';
import { SideNavigation } from '../components/admin/navigation/SideNavigation';
import { UserStats } from '../components/admin/UserStats';
import { UserActivity } from '../components/admin/UserActivity';
import { Dashboard } from '../components/admin/dashboard/Dashboard';
import { UserActiveGraph } from '../components/admin/dashboard/UserActiveGraph';
import { useAnnouncements } from '../hooks/useAnnouncements';

import { useUsers } from '../hooks/useUsers';
import { showErrorToast, showSuccessToast } from '../utils/notifications';
import type { User } from '../types/auth';
import type { Task } from '../types/index';
import type { NewTask } from '../types/task';

import type { AdminTab } from '../types/admin';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { RefreshCcw, AlertTriangle, Loader2, Plus, Home, ChevronRight, Calendar } from 'lucide-react';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/react';

// Minimum time between refreshes (in ms)
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds
const VISIBILITY_REFRESH_THRESHOLD = 300000; // 5 minutes

// Lazy load heavy components
const UserList = lazy(() => import('../components/admin/UserList').then(module => ({ default: module.UserList })));
const TaskManager = lazy(() => import('../components/admin/TaskManager').then(module => ({ default: module.TaskManager })));
const TaskManagerEnhanced = lazy(() => import('../components/admin/TaskManagerEnhanced').then(module => ({ default: module.TaskManagerEnhanced })));
const AnnouncementManager = lazy(() => import('../components/admin/announcement/AnnouncementManager').then(module => ({ default: module.AnnouncementManager })));
const LectureSlidesManager = lazy(() => import('../components/admin/lecture-slides/LectureSlidesManager').then(module => ({ default: module.LectureSlidesManager })));
const FCMTokenManager = lazy(() => import('../components/admin/fcm/FCMTokenManager'));



interface AdminDashboardProps {
  users: User[];
  tasks: Task[];
  onLogout: () => void;
  onDeleteUser: (userId: string) => void;
  onCreateTask: (task: NewTask, sectionId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  isSectionAdmin?: boolean;
  sectionId?: string;
  sectionName?: string;
}

export function AdminDashboard({
  users = [],
  tasks,
  onLogout,
  onDeleteUser,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  isSectionAdmin = false,
  sectionId,
  sectionName
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openTaskFormV2, setOpenTaskFormV2] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const previousTabRef = useRef<AdminTab | null>(null);
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const isPageActiveRef = useRef<boolean>(true);
  const refreshTimeoutRef = useRef<number | null>(null);
  const lastRefreshByTabRef = useRef<Record<string, number>>({});
  const isInitialMountRef = useRef<boolean>(true);
  const pendingRefreshRef = useRef<boolean>(false);

  // Get current user from auth for debugging
  const { user } = useAuth();
  const {
    refreshTasks,
    loading: tasksLoading
  } = useTasks(user?.id);

  const handleRefresh = useCallback(async (event: RefresherCustomEvent) => {
    const startTime = Date.now();
    const MIN_REFRESH_DURATION = 600; // Reduced minimum duration for snappier UX
    
    try {
      console.log('[AdminDashboard] Pull-to-refresh initiated - refreshing data');
      
      // Haptic feedback on pull start
      if ('vibrate' in navigator) navigator.vibrate(10);
      
      // Optimized: Only refresh data, DO NOT clear localStorage
      // This preserves auth tokens and prevents unwanted logout
      const success = await refreshTasks(true);
      
      // Ensure minimum display time for smooth UX
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_REFRESH_DURATION) {
        await new Promise(resolve => setTimeout(resolve, MIN_REFRESH_DURATION - elapsed));
      }
      
      // Success haptic feedback
      if (success && 'vibrate' in navigator) {
        navigator.vibrate([5, 50, 5]);
      }
      
      console.log('[AdminDashboard] Pull-to-refresh completed:', success ? 'success' : 'with errors');
    } catch (error) {
      console.error('[AdminDashboard] Refresh error:', error);
      if ('vibrate' in navigator) navigator.vibrate(100);
    } finally {
      event.detail.complete();
    }
  }, [refreshTasks]);

  // Reset task form state when navigating away from tasks tab
  useEffect(() => {
    if (previousTabRef.current === 'tasks' && activeTab !== 'tasks') {
      // Clean up task form state when leaving tasks tab
      setIsCreatingTask(false);
      setShowTaskForm(false);
      setError(null);
    }

    // Reset openTaskFormV2 when switching away from task-management-v2
    if (activeTab !== 'task-management-v2') {
      setOpenTaskFormV2(false);
    }

    previousTabRef.current = activeTab;
  }, [activeTab]);

  // Reset openTaskFormV2 after it's been consumed by TaskManagerEnhanced
  useEffect(() => {
    if (openTaskFormV2 && activeTab === 'task-management-v2') {
      const timer = setTimeout(() => {
        setOpenTaskFormV2(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openTaskFormV2, activeTab]);

  // Force task form visible when task management tab is activated
  useEffect(() => {
    if (activeTab === 'tasks') {
      setShowTaskForm(true);
      // Reset task creation states when entering the tab
      setIsCreatingTask(false);
    }
  }, [activeTab]);

  // Filter tasks for section admin - memoized for performance
  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return tasks;
    }
    return tasks.filter(task => task.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);

  // Conditionally load data based on active tab
  const {
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements
  } = useAnnouncements();

  // Filter announcements for section admin - memoized for performance
  const filteredAnnouncements = useMemo(() => {
    if (!isSectionAdmin || !sectionId || activeTab !== 'announcements') {
      return []; // Only compute when needed
    }
    return announcements.filter(announcement => {
      return !announcement.sectionId || announcement.sectionId === sectionId;
    });
  }, [announcements, isSectionAdmin, sectionId, activeTab]);





  // Load user data only when needed
  const {
    deleteUser,
    promoteUser,
    demoteUser,
    refreshUsers,
    loading: usersLoading
  } = useUsers();

  // Filter users for section admin - memoized for performance
  const filteredUsers = useMemo(() => {
    if (!sectionId || (activeTab !== 'users' && activeTab !== 'dashboard')) {
      return []; // Only compute when needed
    }
    return users.filter(u => u.sectionId === sectionId);
  }, [users, sectionId, activeTab]);



  // Track page visibility for internal state only - no auto-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageActiveRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check for mobile view on mount and resize with debounce
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    // Initial check
    checkMobileView();

    // Debounced resize handler
    let resizeTimer: number;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(checkMobileView, 250);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUser(userId);
      showSuccessToast('User deleted successfully');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showErrorToast(`Failed to delete user: ${error.message}`);
    }
  }, [deleteUser, refreshUsers]);

  const handleToggleSidebar = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  }, []);

  // Tab change handling - no auto-refresh, only manual refresh by user
  const handleTabChange = useCallback((tab: AdminTab) => {
    // Skip if already on this tab
    if (tab === activeTab) return;

    // Store previous tab
    previousTabRef.current = activeTab;

    // Reset states when changing tabs
    setError(null);
    setIsCreatingTask(false);

    setActiveTab(tab);

    // Only set UI states, no data fetching
    switch (tab) {
      case 'tasks':
        setShowTaskForm(true);
        break;
      default:
        setShowTaskForm(false);
    }
  }, [
    activeTab,
    refreshAnnouncements,
    refreshTasks,
    refreshUsers
  ]);

  // Optimized manual refresh with better error handling
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent multiple refreshes

    try {
      setIsRefreshing(true);
      setError(null);
      setIsCreatingTask(false); // Reset task creation state

      // Only refresh data for the active tab to reduce load
      switch (activeTab) {
        case 'tasks':
          await refreshTasks(true); // Force refresh for tasks
          break;
        case 'users':
          await refreshUsers();
          break;
        case 'dashboard':
          // For dashboard, refresh critical data only
          await Promise.all([refreshTasks(), refreshUsers()]);
          break;
        default:
          // For other tabs, just show success without unnecessary refreshes
          break;
      }

      showSuccessToast('Data refreshed successfully');
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data');
      showErrorToast('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, isRefreshing, refreshTasks, refreshUsers]);

  // Create task with section ID assignment and better state management
  const handleCreateTask = useCallback(async (taskData: NewTask) => {
    // Prevent multiple simultaneous task creation attempts
    if (isCreatingTask) {
      console.log('Task creation already in progress');
      return;
    }

    try {
      setIsCreatingTask(true);
      setError(null);

      // If section admin, automatically associate with section
      if (isSectionAdmin && sectionId) {
        // Create the task with section ID attached
        const enhancedTask = {
          ...taskData,
          sectionId
        };
        // Create task with section ID
        await onCreateTask(enhancedTask, sectionId);
      } else {
        await onCreateTask(taskData);
      }

      // After creating a task, refresh the task list to show the new task
      await refreshTasks(true); // Force refresh to ensure latest data

      showSuccessToast('Task created successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      showErrorToast(`Error creating task: ${error.message}`);
      setError(`Failed to create task: ${error.message}`);
    } finally {
      setIsCreatingTask(false);
    }
  }, [isSectionAdmin, onCreateTask, refreshTasks, sectionId, isCreatingTask]);

  // Handle user promotion with memoization
  const handlePromoteUser = useCallback(async (userId: string) => {
    try {
      await promoteUser(userId, 'section-admin');
      showSuccessToast('User promoted to section admin');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to promote user:', error);
      showErrorToast(`Failed to promote user: ${error.message}`);
    }
  }, [promoteUser, refreshUsers]);

  // Handle user demotion with memoization
  const handleDemoteUser = useCallback(async (userId: string) => {
    try {
      await demoteUser(userId, 'user');
      showSuccessToast('User demoted to regular user');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to demote user:', error);
      showErrorToast(`Failed to demote user: ${error.message}`);
    }
  }, [demoteUser, refreshUsers]);





  // Removed auto-recovery effect - it was causing unnecessary refreshes
  // Users can manually refresh if loading is stuck

  // Pre-render loading states for better perceived performance
  const loadingFallback = useMemo(() => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
    </div>
  ), []);

  // Render function for tab content with Suspense fallback
  const renderTabContent = () => {
    return (
      <Suspense fallback={loadingFallback}>
        {activeTab === 'dashboard' && (
          <Dashboard
            users={filteredUsers}
            tasks={filteredTasks}
          />
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 sm:space-y-6">
            <UserStats
              users={filteredUsers}
              tasks={filteredTasks}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <UserActiveGraph users={filteredUsers} />
              </div>
              <div>
                <UserActivity users={filteredUsers} />
              </div>
            </div>

            <UserList
              users={filteredUsers}
              onDeleteUser={handleDeleteUser}
              onPromoteUser={handlePromoteUser}
              onDemoteUser={handleDemoteUser}
              isSectionAdmin={isSectionAdmin}
              isLoading={usersLoading}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-800 dark:text-red-300 font-medium text-sm">Error loading tasks</h3>
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
                  <button
                    className="mt-2 px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg hover:bg-red-200 dark:hover:bg-red-700 flex items-center gap-1.5"
                    onClick={handleManualRefresh}
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {(tasksLoading || isCreatingTask) && (
              <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 z-50 border border-gray-200 dark:border-gray-700">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {isCreatingTask ? 'Creating task...' : 'Loading tasks...'}
                </span>
              </div>
            )}

            <TaskManager
              tasks={filteredTasks}
              onCreateTask={handleCreateTask}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              showTaskForm={showTaskForm}
              sectionId={sectionId}
              isSectionAdmin={isSectionAdmin}
              isLoading={isRefreshing}
              isCreatingTask={isCreatingTask}
              onTaskCreateStart={() => setIsCreatingTask(true)}
              onTaskCreateEnd={() => setIsCreatingTask(false)}
              onRefresh={handleManualRefresh}
            />
          </>
        )}

        {activeTab === 'task-management-v2' && (
          <TaskManagerEnhanced
            userId={user?.id || ''}
            sectionId={sectionId}
            isSectionAdmin={isSectionAdmin}
            isAdmin={!isSectionAdmin}
            openCreateForm={openTaskFormV2}
            onCloseCreateForm={() => setOpenTaskFormV2(false)}
          />
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
            <AnnouncementManager
              announcements={filteredAnnouncements}
              onCreateAnnouncement={createAnnouncement}
              onDeleteAnnouncement={deleteAnnouncement}
            />
          </div>
        )}

        {activeTab === 'fcm-management' && isSectionAdmin && sectionId && user?.id && (
          <FCMTokenManager
            sectionId={sectionId}
            sectionName={sectionName || 'Unknown Section'}
            userId={user.id}
          />
        )}

        {activeTab === 'lecture-slides' && sectionId && (
          <LectureSlidesManager
            sectionId={sectionId}
          />
        )}


      </Suspense>
    );
  };

  // Memoized main layout structure to prevent unnecessary re-renders
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      <SideNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        onCollapse={handleToggleSidebar}
        isSectionAdmin={isSectionAdmin}
        onCreateTask={() => setOpenTaskFormV2(true)}
      />

      <main className="flex-1 w-full transition-all duration-300 h-full flex flex-col relative bg-gray-50 dark:bg-gray-900">
        {/* Professional Header */}
        <header 
          className={`
            bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 
            px-4 sm:px-6 py-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm
            transition-all duration-200
            ${isMobileView ? 'pl-20' : ''}
          `}
        >
          <div className="flex flex-col gap-1.5">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400">
               <Home className="w-3.5 h-3.5 mr-1.5" />
               <span>Admin</span>
               <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-300 dark:text-gray-600" />
               <span className="text-gray-900 dark:text-blue-400">
                 {activeTab === 'dashboard' && 'Dashboard'}
                 {activeTab === 'users' && 'Users'}
                 {activeTab === 'tasks' && 'Tasks'}
                 {activeTab === 'task-management-v2' && 'Tasks'}
                 {activeTab === 'announcements' && 'Announcements'}
                 {activeTab === 'lecture-slides' && 'Slides'}
                 {activeTab === 'fcm-management' && 'Push Notifications'}
               </span>
            </nav>
            
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {activeTab === 'dashboard' && 'Overview'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'tasks' && 'Legacy Tasks'}
                  {activeTab === 'task-management-v2' && 'Task Management'}
                  {activeTab === 'announcements' && 'Announcements'}
                  {activeTab === 'lecture-slides' && 'Lecture Slides'}
                  {activeTab === 'fcm-management' && 'Push Notifications'}
                </h1>
                {isSectionAdmin && sectionName && (
                   <span className="px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800 tracking-wide">
                     {sectionName}
                   </span>
                )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
               <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
               <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                 {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
               </span>
            </div>
            
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

            <button
               onClick={handleManualRefresh}
               disabled={isRefreshing}
               className={`p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 transition-all shadow-sm active:scale-95 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
               title="Refresh Data"
               aria-label="Refresh Data"
            >
               <RefreshCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        <IonContent className="flex-1" style={{ '--background': 'transparent' }}>
  <IonRefresher slot="fixed" onIonRefresh={handleRefresh} pullFactor={0.5} pullMin={60} pullMax={120}>
    <IonRefresherContent
      pullingIcon="chevron-down-circle-outline"
      pullingText="Pull to refresh..."
      refreshingSpinner="circles"
      refreshingText="Refreshing data..."
    />

          <div className="max-w-full mx-auto p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6">

            {error && (
              <div className="mb-4 p-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              {renderTabContent()}
            </div>
          </div>
        </IonContent>
      </main>

      {/* Mobile FAB - Create Task */}
      <button
        onClick={() => {
          setActiveTab('task-management-v2');
          // Delay to ensure tab switch completes first
          setTimeout(() => {
            setOpenTaskFormV2(true);
          }, 150);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 active:scale-95"
        aria-label="Create Task"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}