import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';
import { useNotifications } from './hooks/useNotifications';
import { AuthPage } from './pages/AuthPage';
import { LoadingScreen } from './components/LoadingScreen';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { InstallPWA } from './components/InstallPWA';
import { OfflineToast } from './components/ui/OfflineToast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { isSameDay } from './utils/dateUtils';
import { InstantTransition } from './components/InstantTransition';
import type { NavPage } from './types/navigation';
import type { TaskCategory } from './types/task';
import type { Task } from './types/task';
import type { User } from './types/user';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { supabase } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Page import functions
const importAdminDashboard = () => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard }));
const importSuperAdminDashboard = () => import('./components/admin/super/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard }));
const importUpcomingPage = () => import('./pages/UpcomingPage').then(module => ({ default: module.UpcomingPage }));
const importSearchPage = () => import('./pages/SearchPage').then(module => ({ default: module.SearchPage }));
const importCoursePage = () => import('./pages/CoursePage').then(module => ({ default: module.CoursePage }));
const importStudyMaterialsPage = () => import('./pages/StudyMaterialsPage').then(module => ({ default: module.StudyMaterialsPage }));
const importRoutinePage = () => import('./pages/RoutinePage').then(module => ({ default: module.RoutinePage }));
const importLectureSlidesPage = () => import('./pages/LectureSlidesPage').then(module => ({ default: module.LectureSlidesPage }));

// Lazy-loaded components
const AdminDashboard = lazy(importAdminDashboard);
const SuperAdminDashboard = lazy(importSuperAdminDashboard);
const UpcomingPage = lazy(importUpcomingPage);
const SearchPage = lazy(importSearchPage);
const CoursePage = lazy(importCoursePage);
const StudyMaterialsPage = lazy(importStudyMaterialsPage);
const RoutinePage = lazy(importRoutinePage);
const LectureSlidesPage = lazy(importLectureSlidesPage);

type StatFilter = 'all' | 'overdue' | 'in-progress' | 'completed';

export default function App() {
  // Initialize Status Bar for native mobile apps
  useEffect(() => {
    const initStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#1e293b' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (error) {
          console.error('Failed to configure status bar:', error);
        }
      }
    };
    initStatusBar();
  }, []);

  // Always call all hooks first, regardless of any conditions
  const { user, loading: authLoading, error: authError, login, signup, logout, forgotPassword } = useAuth();
  
  // Debug user role
  useEffect(() => {
    if (user) {
      console.log('Current user role:', user.role);
      console.log('Complete user object:', user);
    }
  }, [user]);
  
  const { users, loading: usersLoading, deleteUser } = useUsers();
  const { 
    tasks, 
    loading: tasksLoading, 
    createTask, 
    updateTask, 
    deleteTask,
    refreshTasks,
  } = useTasks(user?.id);
  
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

  const { 
    notifications, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    clearNotification 
  } = useNotifications(user?.id);
  
  const [activePage, setActivePage] = useState<NavPage>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetPasswordFlow, setIsResetPasswordFlow] = useState(false);
  
  // Track if we just returned from a hidden state to prevent blank screens
  const [wasRecentlyHidden, setWasRecentlyHidden] = useState(false);
  
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
    // Reduce artificial loading delay to improve perceived performance
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Reduced from 2000ms to 800ms

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
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <UpcomingPage tasks={tasks || []} />
          </Suspense>
        );
      case 'search':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <SearchPage tasks={tasks || []} />
          </Suspense>
        );
      case 'courses':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <CoursePage />
          </Suspense>
        );
      case 'study-materials':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <StudyMaterialsPage />
          </Suspense>
        );
      case 'routine':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <RoutinePage />
          </Suspense>
        );
      case 'lecture-slides':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <LectureSlidesPage />
          </Suspense>
        );
      default:
        return (
          <HomePage
            user={user as User}
            tasks={tasks || []}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            statFilter={statFilter}
            setStatFilter={setStatFilter}
          />
        );
    }
  };

  // Early returns based on loading state and authentication
  // Don't show loading screen if we just returned from hidden state (prevents blank screen)
  const shouldShowInitialLoading = !wasRecentlyHidden && (
    isLoading || authLoading || ((user?.role === 'admin' || user?.role === 'super-admin') && usersLoading)
  );
  
  if (shouldShowInitialLoading) {
    return <LoadingScreen minimumLoadTime={1000} showProgress={true} />;
  }

  // Handle password reset flow
  if (isResetPasswordFlow) {
    return <ResetPasswordPage />;
  }

  // Debug log to show the current user's section ID
  if (user) {
    console.log('[Debug] Current user in App.tsx:', {
      id: user.id,
      role: user.role,
      sectionId: user.sectionId,
      sectionName: user.sectionName
    });
  }

  if (!user) {
    return (
      <AuthPage
        onLogin={(credentials, rememberMe = false) => login(credentials, rememberMe)}
        onSignup={async (credentials) => {
          const user = await signup(credentials);
          return undefined; // Explicitly return undefined to match void type
        }}
        onForgotPassword={forgotPassword}
        error={authError || undefined}
      />
    );
  }

  // Check for super-admin role first
  if (user.role === 'super-admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <SuperAdminDashboard />
      </Suspense>
    );
  }

  // Then check for regular admin role
  if (user.role === 'admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <AdminDashboard
          users={users}
          tasks={tasks}
          onLogout={logout}
          onDeleteUser={handleDeleteUser}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          isSectionAdmin={false}
          sectionId={undefined}
          sectionName={undefined}
        />
      </Suspense>
    );
  }

   // Add handling for section_admin role
   if (user.role === 'section_admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <AdminDashboard
          users={users.filter(u => u.sectionId === user.sectionId)} // Only users from their section
          tasks={tasks}
          onLogout={logout}
          onDeleteUser={handleDeleteUser}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          isSectionAdmin={true}
          sectionId={user.sectionId}
          sectionName={user.sectionName}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 app-container">
      <OfflineBanner />
      <Navigation 
        onLogout={logout}
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationsClick={() => setShowNotifications(true)}
        activePage={activePage}
        onPageChange={setActivePage}
        user={{
          name: user.name,
          email: user.email,
          avatar: user.avatar || '' // Provide a default value
        }}
        taskStats={taskStats}
        tasks={tasks}
      />
      
      <main 
        className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-24"
      >
        {tasksLoading && !wasRecentlyHidden && tasks.length === 0 ? (
          <LoadingScreen minimumLoadTime={500} showProgress={false} />
        ) : (
          renderContent()
        )}
      </main>

      <BottomNavigation 
        activePage={activePage}
        onPageChange={setActivePage}
        hasUnreadNotifications={hasUnreadNotifications}
        todayTaskCount={todayTaskCount}
      />

      <InstallPWA />
      <OfflineToast />
    </div>
  );
}
