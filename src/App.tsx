import { useState, useEffect, useMemo, useCallback, lazy, Suspense, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';
import { useNotifications } from './hooks/useNotifications';
import { usePushNotifications } from './hooks/usePushNotifications';
import { AuthPage } from './pages/AuthPage';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { LoadingScreen } from './components/LoadingScreen';
import { isSameDay } from './utils/dateUtils';
import type { NavPage } from './types/navigation';
import type { TaskCategory } from './types/task';
import type { User } from './types/user';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { supabase } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { useSupabaseLifecycle } from './hooks/useSupabaseLifecycle';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { getPendingOpenTaskId } from './services/pushNavigationService';
import { IonApp, IonContent, IonRefresher, IonRefresherContent, setupIonicReact } from '@ionic/react';
import type { RefresherEventDetail } from '@ionic/react';
import { RoutineSkeleton } from './components/routine/RoutineSkeleton';

// Initialize Ionic React
setupIonicReact({
  mode: 'md', // Use Material Design mode for consistent look
  animated: false, // Disable animations to reduce forced reflows
});

// Page import functions
const importUpcomingPage = () => import('./pages/UpcomingPage').then(module => ({ default: module.UpcomingPage }));
const importSearchPage = () => import('./pages/SearchPage').then(module => ({ default: module.SearchPage }));
const importLectureSlidesPage = () => import('./pages/LectureSlidesPage').then(module => ({ default: module.LectureSlidesPage }));
const importRoutinePage = () => import('./pages/RoutinePage').then(module => ({ default: module.RoutinePage }));

// Lazy-loaded components
const UpcomingPage = lazy(importUpcomingPage);
const SearchPage = lazy(importSearchPage);
const LectureSlidesPage = lazy(importLectureSlidesPage);
const RoutinePage = lazy(importRoutinePage);

type StatFilter = 'all' | 'overdue' | 'in-progress' | 'completed';

export default function App() {
  const navigate = useNavigate();
  
  // Initialize Status Bar for native mobile apps - optimized for proper safe area handling
  useEffect(() => {
    const initStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Set status bar to not overlay WebView - this ensures proper safe area calculation
          await StatusBar.setOverlaysWebView({ overlay: false });
          
          // Set status bar style (light text for dark backgrounds)
          await StatusBar.setStyle({ style: Style.Dark });
          
          // Set status bar background color to match header
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          
          // Show the status bar (in case it was hidden)
          await StatusBar.show();
          
          console.log('[StatusBar] Configured successfully');
        } catch (error) {
          console.error('[StatusBar] Failed to configure:', error);
        }
      }
    };
    initStatusBar();
    
    // Also handle theme changes for status bar color
    const handleThemeChange = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const isDark = document.documentElement.classList.contains('dark');
          await StatusBar.setBackgroundColor({ color: isDark ? '#111827' : '#ffffff' });
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        } catch (error) {
          console.error('[StatusBar] Failed to update theme:', error);
        }
      }
    };
    
    // Watch for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          handleThemeChange();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Always call all hooks first, regardless of any conditions
  const { user, loading: authLoading, error: authError, login, signup, logout, forgotPassword } = useAuth();

  // Critical: keep Supabase session healthy across tab/app backgrounding.
  useSupabaseLifecycle({ enabled: true });
  
  const { users, loading: usersLoading, deleteUser, refreshUsers } = useUsers();
  
  // Initialize push notifications for native platforms
  const { isRegistered: isPushRegistered, register: registerPush } = usePushNotifications();
  
  // Auto-register for push notifications when user logs in on native platform
  useEffect(() => {
    if (user && Capacitor.isNativePlatform() && !isPushRegistered) {
      registerPush();
    }
  }, [user, isPushRegistered, registerPush]);
  
  // Push notification click handling:
  // - Listeners are registered early in main.tsx (pushNavigationService)
  // - This effect consumes any pending taskId (killed-state launch)
  //   and listens for in-app events while running.
  useEffect(() => {
    if (!user) return; // Only run when user is logged in
    
    // Check immediately for pending taskId
    const checkPending = () => {
      const pendingTaskId = getPendingOpenTaskId();
      if (pendingTaskId) {
        handlePageChange('upcoming');
        setNotificationOpenTaskId(pendingTaskId);
        return true;
      }
      return false;
    };

    // Check now
    const found = checkPending();
    
    // If not found, poll a few more times (for race conditions)
    if (!found) {
      const pollInterval = setInterval(() => {
        if (checkPending()) {
          clearInterval(pollInterval);
        }
      }, 100);
      
      // Stop polling after 2 seconds
      setTimeout(() => clearInterval(pollInterval), 2000);
    }

    const onOpenTask = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId?: unknown }>;
      const taskId = customEvent?.detail?.taskId;
      if (typeof taskId === 'string' && taskId.length > 0) {
        handlePageChange('upcoming');
        setNotificationOpenTaskId(taskId);
      }
    };

    window.addEventListener('open-task-from-notification', onOpenTask as EventListener);
    return () => window.removeEventListener('open-task-from-notification', onOpenTask as EventListener);
  }, [user]);
  
  const { 
    tasks, 
    loading: tasksLoading, 
    createTask, 
    updateTask, 
    deleteTask,
    refreshTasks,
  } = useTasks(user?.id);

  // Track completion of the initial task fetch for the current session.
  // Allows Home to show a skeleton even if fetching resolves very quickly.
  useEffect(() => {
    if (!user?.id) {
      setHasCompletedInitialTasksLoad(false);
      return;
    }

    if (!tasksLoading) {
      setHasCompletedInitialTasksLoad(true);
    }
  }, [user?.id, tasksLoading]);
  
  // Create handler functions for admin dashboard
  const handleDeleteUser = useCallback((userId: string) => {
    return deleteUser(userId);
  }, [deleteUser]);
  
  const handleCreateTask = useCallback((task: any, sectionId?: string) => {
    return createTask(task, sectionId);
  }, [createTask]);
  
  const handleDeleteTask = useCallback((taskId: string) => {
    return deleteTask(taskId);
  }, [deleteTask]);
  
  const handleUpdateTask = useCallback((taskId: string, updates: any) => {
    return updateTask(taskId, updates);
  }, [updateTask]);

  // Pull-to-refresh handler
  const handlePullToRefresh = useCallback(async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      const refreshPromises: Promise<unknown>[] = [];
      
      if (user?.id) {
        refreshPromises.push(refreshTasks(true));
      }
      
      // Refresh users for admin roles
      const isAdmin = user?.role === 'admin' || user?.role === 'super-admin' || user?.role === 'section_admin';
      if (isAdmin) {
        refreshPromises.push(refreshUsers());
      }
      
      await Promise.allSettled(refreshPromises);
    } finally {
      event.detail.complete();
    }
  }, [user?.id, user?.role, refreshTasks, refreshUsers]);

  const { 
    notifications, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    clearNotification 
  } = useNotifications(user?.id);
  
  // Initialize activePage from URL pathname
  const getInitialPage = (): NavPage => {
    const path = window.location.pathname.slice(1); // Remove leading slash
    const validPages: NavPage[] = ['home', 'upcoming', 'search', 'routine', 'lecture-slides'];
    return validPages.includes(path as NavPage) ? (path as NavPage) : 'home';
  };

  const [activePage, setActivePage] = useState<NavPage>(getInitialPage());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationOpenTaskId, setNotificationOpenTaskId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [hasCompletedInitialTasksLoad, setHasCompletedInitialTasksLoad] = useState(false);
  const [hasStartedInitialTasksLoad, setHasStartedInitialTasksLoad] = useState(false);
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetPasswordFlow, setIsResetPasswordFlow] = useState(false);

  // Sync URL with activePage state - optimized to prevent unnecessary renders
  const handlePageChange = useCallback((page: NavPage) => {
    // Skip if already on that page
    if (page === activePage) return;
    
    // Use startTransition for non-urgent state updates
    startTransition(() => {
      setActivePage(page);
    });
    
    // Update URL without reload
    const newPath = page === 'home' ? '/' : `/${page}`;
    window.history.pushState({ page }, '', newPath);
  }, [activePage]);

  // Memoized callback to consume notification task ID
  const handleOpenTaskIdConsumed = useCallback(() => {
    setNotificationOpenTaskId(null);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname.slice(1);
      const validPages: NavPage[] = ['home', 'upcoming', 'search', 'routine', 'lecture-slides'];
      setHasStartedInitialTasksLoad(false);
      const newPage = validPages.includes(path as NavPage) ? (path as NavPage) : 'home';
      setActivePage(newPage);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track initial tasks load completion (used to show Home skeleton before first data arrives)
  useEffect(() => {
    // Reset on logout
    if (!user?.id) {
      setHasStartedInitialTasksLoad(false);
      setHasCompletedInitialTasksLoad(false);
      return;
    }

    if (tasksLoading) {
      setHasStartedInitialTasksLoad(true);
      return;
    }

    if (hasStartedInitialTasksLoad && !tasksLoading) {
      setHasCompletedInitialTasksLoad(true);
    }
  }, [user?.id, tasksLoading, hasStartedInitialTasksLoad]);
  
  // Track if we just returned from a hidden state to prevent blank screens
  const [wasRecentlyHidden, setWasRecentlyHidden] = useState(false);
  
  // Handle admin redirect after successful login - only from non-admin routes
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Skip redirect logic entirely if we're already on admin routes
    if (currentPath.startsWith('/admin') || currentPath.startsWith('/superadmin')) {
      return;
    }

    // Redirect admins from regular user pages to their dashboard
    if (user && (user.role === 'admin' || user.role === 'super-admin' || user.role === 'section_admin')) {
      console.log(`[Admin Redirect] User role: ${user.role}, redirecting from ${currentPath}...`);
      
      if (user.role === 'super-admin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);
  
  // Track visibility to prevent blank screens on tab switch
  useEffect(() => {
    let wasHidden = false;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
      } else if (document.visibilityState === 'visible' && wasHidden) {
        setWasRecentlyHidden(true);
        // Clear the flag after content has had time to render
        setTimeout(() => setWasRecentlyHidden(false), 500);
        wasHidden = false;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate today's task count - always compute this value regardless of rendering path
  const todayTaskCount = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day
    
    return tasks.filter(task => {
      // Skip tasks with invalid dates
      if (!task.dueDate) return false;
      
      try {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0); // Normalize task date to start of day
        
        // Only count non-completed tasks due today
        return isSameDay(taskDate, today) && task.status !== 'completed';
      } catch (e) {
        // Skip tasks with invalid date format
        return false;
      }
    }).length;
  }, [tasks]);

  // Compute task stats - for the Navigation component
  const taskStats = useMemo(() => {
    // Make sure we have a valid tasks array before calculating
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    const totalTasks = validTasks.length;
    
    // Count all tasks regardless of status or category
    return {
      total: totalTasks,
      inProgress: validTasks.filter(t => t.status === 'in-progress').length,
      completed: validTasks.filter(t => t.status === 'completed').length,
      overdue: 0 // Add the missing property
    };
  }, [tasks]);

  // Check for unread notifications - moved here from inside render
  const hasUnreadNotifications = useMemo(() => unreadCount > 0, [unreadCount]);

  // Check URL hash for recovery path
  const checkHashForRecovery = useCallback(() => {
    const hash = window.location.hash;
    
    // If the URL contains the recovery path, set the reset password flow
    if (hash.includes('#auth/recovery')) {
      setIsResetPasswordFlow(true);
    }
  }, []);
  
  // Check hash on initial load and when it changes
  useEffect(() => {
    // Minimal loading delay for smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Reduced from 800ms to 300ms for faster perceived load

    // Check hash on initial load
    checkHashForRecovery();
    
    // Also listen for hash changes
    const handleHashChange = () => {
      checkHashForRecovery();
    };
    
    // Handle page visibility changes (for pull-to-refresh)
    // Track when we last became hidden
    let lastHiddenTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Record when we went hidden
        lastHiddenTime = Date.now();
        localStorage.setItem('lastActiveTimestamp', lastHiddenTime.toString());
        return;
      }
      
      if (document.visibilityState === 'visible') {
        // Calculate how long we were hidden
        const now = Date.now();
        const hiddenDuration = now - lastHiddenTime;
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
        const wasInactiveLong = hiddenDuration > inactiveThreshold;
        
        // Update timestamp
        localStorage.setItem('lastActiveTimestamp', now.toString());
        
        // Only refresh if we have a user and were away for a while
        if (user?.id && wasInactiveLong) {
          console.log(`Page visible after ${Math.round(hiddenDuration / 1000)}s - refreshing data`);
          
          // Simple refresh without aggressive connection checking
          // This prevents the blank screen issue
          setTimeout(() => {
            refreshTasks(true);
          }, 100);
        } else if (user?.id) {
          // For short inactivity, just log without refreshing
          console.log('Page visible - short inactivity, no refresh needed');
        }
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for auth state changes, including password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordFlow(true);
      }
    });
    
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHashForRecovery, refreshTasks, user?.id]);

  const renderContent = () => {
    switch (activePage) {
      case 'upcoming':
        return (
          <Suspense fallback={null}>
            <UpcomingPage
              tasks={tasksLoading ? undefined : tasks}
              openTaskId={notificationOpenTaskId}
              onOpenTaskIdConsumed={handleOpenTaskIdConsumed}
            />
          </Suspense>
        );
      case 'search':
        return (
          <Suspense fallback={
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 animate-pulse">
              <div className="h-10 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
                  <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                </div>
              ))}
            </div>
          }>
            <SearchPage tasks={tasks || []} />
          </Suspense>
        );
      case 'lecture-slides':
        return (
          <Suspense fallback={
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 animate-pulse">
              <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 sm:w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="h-32 sm:h-40 bg-gray-200 dark:bg-gray-700" />
                    <div className="p-3 sm:p-4 space-y-2">
                      <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }>
            <LectureSlidesPage />
          </Suspense>
        );
      case 'routine':
        return (
          <Suspense fallback={<RoutineSkeleton />}>
            <RoutinePage />
          </Suspense>
        );
      default:
        return (
          <HomePage
            user={user as User}
            tasks={tasks || []}
            tasksLoading={tasksLoading}
            hasCompletedInitialTasksLoad={hasCompletedInitialTasksLoad}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            statFilter={statFilter}
            setStatFilter={setStatFilter}
          />
        );
    }
  };

  // Early returns based on loading state and authentication
  // Only show skeleton for initial auth load, not for task loading
  const isInitialLoading = authLoading && !user;

  // Show minimal skeleton only during true initial auth loading
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center animate-fadeIn p-4">
        <div className="w-full max-w-7xl mx-auto space-y-5">
          {/* Logo and Brand */}
          <div className="text-center mb-6 sm:mb-8 animate-slideUp">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">NestTask</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Loading your workspace...</p>
          </div>
          
          {/* Welcome Header Skeleton */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-6 shadow-lg animate-pulse">
            <div className="h-6 sm:h-7 bg-blue-500/50 rounded-lg w-36 sm:w-48 mb-2" />
            <div className="h-4 sm:h-5 bg-blue-500/30 rounded-lg w-48 sm:w-64" />
          </div>
          
          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 min-h-stat-card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 sm:w-14 mb-1.5" />
                    <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Categories Skeleton */}
          <div className="space-y-3 animate-pulse">
            <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20 sm:w-24" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 min-h-category-card">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-1.5 sm:space-y-2">
                      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20" />
                      <div className="h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-10 sm:w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Task List Skeleton */}
          <div className="w-full max-w-7xl mx-auto">
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
                gap-2 xs:gap-3 md:gap-4 lg:gap-6
                px-1 xs:px-2 md:px-0
                pb-4 md:pb-0"
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="relative bg-white dark:bg-gray-800 md:bg-white md:dark:bg-gray-800
                    rounded-2xl md:rounded-lg
                    border border-gray-100 dark:border-gray-700/50
                    p-3 md:p-4 lg:p-5
                    min-h-[110px]
                    animate-pulse"
                >
                  <div className="space-y-2">
                    {/* Title + category tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 md:h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-4 md:h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>

                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-600/50 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700 rounded hidden md:inline-block" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-14" />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>

                    {/* Footer row (status + date) */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-14" />
                      </div>
                      <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle password reset flow
  if (isResetPasswordFlow) {
    return <ResetPasswordPage />;
  }

  if (!user) {
    return (
      <div className="animate-fadeIn">
        <AuthPage
          onLogin={(credentials, rememberMe = false) => login(credentials, rememberMe)}
          onSignup={async (credentials) => {
            const user = await signup(credentials);
            return undefined; // Explicitly return undefined to match void type
          }}
          onForgotPassword={forgotPassword}
          error={authError || undefined}
        />
      </div>
    );
  }

  return (
    <IonApp>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 app-container safe-area-container flex flex-col">
        {/* Navigation Header - Fixed at top */}
        <Navigation 
          onLogout={logout}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationsClick={() => setShowNotifications(true)}
          activePage={activePage}
          onPageChange={handlePageChange}
          user={{
            name: user.name,
            email: user.email,
            avatar: user.avatar || ''
          }}
          taskStats={taskStats}
          tasks={tasks}
        />
        
        {/* Main Content Area with Pull-to-Refresh */}
        <div className="flex-1 relative overflow-hidden">
          <IonContent scrollY fullscreen className="h-full">
            <IonRefresher slot="fixed" onIonRefresh={handlePullToRefresh}>
              <IonRefresherContent />
            </IonRefresher>
            
            <main 
              className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-24 lg:pb-12"
            >
              {renderContent()}
            </main>
          </IonContent>
        </div>

        {/* Bottom Navigation - Fixed at bottom */}
        <BottomNavigation 
          activePage={activePage}
          onPageChange={handlePageChange}
          hasUnreadNotifications={hasUnreadNotifications}
          todayTaskCount={todayTaskCount}
        />
      </div>
      
      {/* Vercel Analytics & Speed Insights */}
      <Analytics />
      <SpeedInsights />
    </IonApp>
  );
}
