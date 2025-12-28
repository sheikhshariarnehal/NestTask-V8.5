import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { SideNavigation } from '../components/admin/navigation/SideNavigation';
import { UserStats } from '../components/admin/UserStats';
import { UserActivity } from '../components/admin/UserActivity';
import { Dashboard } from '../components/admin/dashboard/Dashboard';
import { UserActiveGraph } from '../components/admin/dashboard/UserActiveGraph';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useCourses } from '../hooks/useCourses';
import { useRoutines } from '../hooks/useRoutines';
import { useTeachers } from '../hooks/useTeachers';
import { useUsers } from '../hooks/useUsers';
import { showErrorToast, showSuccessToast } from '../utils/notifications';
import type { User } from '../types/auth';
import type { Task } from '../types/index';
import type { NewTask } from '../types/task';
import type { Teacher, NewTeacher } from '../types/teacher';
import type { AdminTab } from '../types/admin';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';

// Lazy load heavy components
const UserList = lazy(() => import('../components/admin/UserList').then(module => ({ default: module.UserList })));
const TaskManager = lazy(() => import('../components/admin/TaskManager').then(module => ({ default: module.TaskManager })));
const TaskManagerEnhanced = lazy(() => import('../components/admin/TaskManagerEnhanced').then(module => ({ default: module.TaskManagerEnhanced })));
const AnnouncementManager = lazy(() => import('../components/admin/announcement/AnnouncementManager').then(module => ({ default: module.AnnouncementManager })));
const CourseManager = lazy(() => import('../components/admin/course/CourseManager').then(module => ({ default: module.CourseManager })));
const StudyMaterialManager = lazy(() => import('../components/admin/study-materials/StudyMaterialManager').then(module => ({ default: module.StudyMaterialManager })));
const LectureSlidesManager = lazy(() => import('../components/admin/lecture-slides/LectureSlidesManager').then(module => ({ default: module.LectureSlidesManager })));
const RoutineManager = lazy(() => import('../components/admin/routine/RoutineManager').then(module => ({ default: module.RoutineManager })));
const TeacherManager = lazy(() => import('../components/admin/teacher/TeacherManager').then(module => ({ default: module.TeacherManager })));

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
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const previousTabRef = useRef<AdminTab | null>(null);
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const isPageActiveRef = useRef<boolean>(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  // Get current user from auth for debugging
  const { user } = useAuth();
  const {
    refreshTasks,
    loading: tasksLoading
  } = useTasks(user?.id);
  
  // Reset task form state when navigating away from tasks tab
  useEffect(() => {
    if (previousTabRef.current === 'tasks' && activeTab !== 'tasks') {
      // Clean up task form state when leaving tasks tab
      setIsCreatingTask(false);
      setShowTaskForm(false);
      setError(null);
    }
    
    previousTabRef.current = activeTab;
  }, [activeTab]);
  
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
  
  // Load course data only when needed
  const {
    courses,
    materials,
    createCourse,
    updateCourse,
    deleteCourse,
    createMaterial,
    deleteMaterial,
    bulkImportCourses,
    refreshCourses
  } = useCourses();

  // Filter courses for section admin - memoized and conditional
  const filteredCourses = useMemo(() => {
    // Only compute when courses tab is active or when needed by other components
    if ((!isSectionAdmin || !sectionId) || 
        (activeTab !== 'courses' && activeTab !== 'study-materials' && 
         activeTab !== 'teachers' && activeTab !== 'routine')) {
      return [];
    }
    return courses.filter(course => course.sectionId === sectionId);
  }, [courses, isSectionAdmin, sectionId, activeTab]);

  // Load routine data only when needed
  const {
    routines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineSlot,
    updateRoutineSlot,
    deleteRoutineSlot,
    activateRoutine,
    deactivateRoutine,
    bulkImportSlots,
    refreshRoutines
  } = useRoutines();

  // Filter routines for section admin - conditional loading
  const filteredRoutines = useMemo(() => {
    if ((!isSectionAdmin || !sectionId) || activeTab !== 'routine') {
      return [];
    }
    return routines.filter(routine => routine.sectionId === sectionId);
  }, [routines, isSectionAdmin, sectionId, activeTab]);

  // Load teacher data only when needed
  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher: deleteTeacherService,
    bulkImportTeachers,
    refreshTeachers
  } = useTeachers();
  
  // Filter teachers for section admin - memoized and conditional
  const filteredTeachers = useMemo(() => {
    if ((!isSectionAdmin || !sectionId) || 
        (activeTab !== 'teachers' && activeTab !== 'routine' && 
         activeTab !== 'courses')) {
      return [];
    }
    return teachers.filter(teacher => {
      if (teacher.sectionId === sectionId) return true;
      return teacher.courses?.some(course => course.sectionId === sectionId);
    });
  }, [teachers, isSectionAdmin, sectionId, activeTab]);
  
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
  


  // Optimized page visibility handling to prevent excessive refreshes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      const now = Date.now();

      isPageActiveRef.current = isVisible;

      if (isVisible) {
        const timeSinceLastChange = now - lastVisibilityChangeRef.current;
        lastVisibilityChangeRef.current = now;

        // Only refresh if page was hidden for more than 2 minutes to prevent excessive refreshes
        if (timeSinceLastChange > 120000) {
          console.log('Page visible after long absence, refreshing current tab data');

          // Clear any pending refresh timeouts
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
          }

          // Debounced refresh to prevent multiple rapid refreshes
          refreshTimeoutRef.current = window.setTimeout(() => {
            switch (activeTab) {
              case 'tasks':
                refreshTasks(true);
                break;
              case 'users':
                refreshUsers();
                break;
              case 'dashboard':
                Promise.all([refreshTasks(), refreshUsers()]);
                break;
              default:
                // Don't auto-refresh other tabs
                break;
            }
            refreshTimeoutRef.current = null;
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [activeTab, refreshTasks, refreshUsers]);

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

  // Optimized tab change handling with smart data loading
  const handleTabChange = useCallback((tab: AdminTab) => {
    // Skip reload if already on this tab
    if (tab === activeTab) return;

    // Store previous tab
    previousTabRef.current = activeTab;

    // Reset states when changing tabs
    setError(null);
    setIsCreatingTask(false);

    setActiveTab(tab);

    // Smart data loading - only refresh if data is likely stale or critical
    const shouldRefreshData = () => {
      // Only refresh if page has been active and we're switching to a data-heavy tab
      return isPageActiveRef.current && (tab === 'tasks' || tab === 'dashboard');
    };

    switch (tab) {
      case 'tasks':
        setShowTaskForm(true);
        // Only force refresh if we really need fresh data
        if (shouldRefreshData()) {
          refreshTasks();
        }
        break;
      case 'users':
        // Only refresh users if switching to users tab and page is active
        if (shouldRefreshData()) {
          refreshUsers();
        }
        break;
      case 'routine':
        // Lazy load routines only when needed
        if (isPageActiveRef.current) {
          refreshRoutines();
        }
        break;
      case 'courses':
        // Lazy load courses only when needed
        if (isPageActiveRef.current) {
          refreshCourses();
        }
        break;
      case 'announcements':
        // Lazy load announcements only when needed
        if (isPageActiveRef.current) {
          refreshAnnouncements();
        }
        break;
      case 'teachers':
        // Lazy load teachers only when needed
        if (isPageActiveRef.current) {
          refreshTeachers();
        }
        break;
      case 'lecture-slides':
        // Lecture slides don't need special refresh logic
        break;
      case 'dashboard':
        // For dashboard, only load key data if page is active
        if (shouldRefreshData()) {
          Promise.all([refreshTasks(), refreshUsers()]);
        }
        break;
      default:
        setShowTaskForm(false);
    }
  }, [
    activeTab,
    refreshAnnouncements,
    refreshCourses,
    refreshRoutines,
    refreshTasks,
    refreshTeachers,
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

  // Optimized teacher deletion with error handling
  const deleteTeacher = useCallback(async (teacherId: string) => {
    if (!teacherId) {
      console.error('Invalid teacher ID provided for deletion');
      showErrorToast('Invalid teacher ID');
      return Promise.resolve();
    }

    try {
      await deleteTeacherService(teacherId);
      showSuccessToast('Teacher deleted successfully');
      await refreshTeachers();
      return Promise.resolve();
    } catch (error: any) {
      console.error('Failed to delete teacher:', teacherId, error);
      showErrorToast(`Error deleting teacher: ${error.message || 'Unknown error'}.`);
      return Promise.resolve();
    }
  }, [deleteTeacherService, refreshTeachers]);

  // Wrapper functions for routine operations to match expected types
  const handleUpdateRoutine = useCallback(async (id: string, updates: Partial<any>) => {
    await updateRoutine(id, updates);
  }, [updateRoutine]);

  const handleDeleteRoutine = useCallback(async (id: string) => {
    await deleteRoutine(id);
  }, [deleteRoutine]);

  const handleUpdateSlot = useCallback(async (routineId: string, slotId: string, updates: Partial<any>) => {
    await updateRoutineSlot(routineId, slotId, updates);
  }, [updateRoutineSlot]);

  const handleDeleteSlot = useCallback(async (routineId: string, slotId: string) => {
    await deleteRoutineSlot(routineId, slotId);
  }, [deleteRoutineSlot]);

  const handleActivateRoutine = useCallback(async (routineId: string) => {
    await activateRoutine(routineId);
  }, [activateRoutine]);

  const handleDeactivateRoutine = useCallback(async (routineId: string) => {
    await deactivateRoutine(routineId);
  }, [deactivateRoutine]);



  // Optimized auto-recovery for stuck loading states - less aggressive
  useEffect(() => {
    let timeoutId: number;

    // Only attempt recovery if we're on tasks tab, loading seems stuck, and page is active
    if (activeTab === 'tasks' && tasksLoading && isPageActiveRef.current) {
      timeoutId = window.setTimeout(() => {
        // Double-check conditions before recovery
        if (activeTab === 'tasks' && tasksLoading && isPageActiveRef.current) {
          console.warn('Task loading appears stuck, attempting recovery');
          handleManualRefresh();
        }
      }, 30000); // Increased timeout to 30 seconds to be much less aggressive
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeTab, tasksLoading, handleManualRefresh]);

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
                isLoading={tasksLoading || isRefreshing}
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

            {activeTab === 'teachers' && (
              <TeacherManager
                teachers={filteredTeachers}
                courses={filteredCourses}
                onCreateTeacher={createTeacher as (teacher: NewTeacher, courseIds: string[]) => Promise<Teacher | undefined>}
                onUpdateTeacher={updateTeacher as (id: string, updates: Partial<Teacher>, courseIds: string[]) => Promise<Teacher | undefined>}
                onDeleteTeacher={deleteTeacher}
                onBulkImportTeachers={bulkImportTeachers}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
              />
            )}

            {activeTab === 'courses' && (
              <CourseManager
                courses={filteredCourses}
                teachers={filteredTeachers}
                onCreateCourse={createCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
                onBulkImportCourses={bulkImportCourses}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
              />
            )}

            {activeTab === 'study-materials' && (
              <StudyMaterialManager
                courses={filteredCourses}
                materials={materials}
                onCreateMaterial={createMaterial}
                onDeleteMaterial={deleteMaterial}
              />
            )}

            {activeTab === 'lecture-slides' && sectionId && (
              <LectureSlidesManager
                sectionId={sectionId}
              />
            )}

            {activeTab === 'routine' && (
              <RoutineManager
                routines={filteredRoutines}
                courses={filteredCourses}
                teachers={filteredTeachers}
                onCreateRoutine={createRoutine}
                onUpdateRoutine={handleUpdateRoutine}
                onDeleteRoutine={handleDeleteRoutine}
                onAddSlot={addRoutineSlot}
                onUpdateSlot={handleUpdateSlot}
                onDeleteSlot={handleDeleteSlot}
                onActivateRoutine={handleActivateRoutine}
                onDeactivateRoutine={handleDeactivateRoutine}
                onBulkImportSlots={bulkImportSlots}
              />
            )}
      </Suspense>
    );
  };

  // Memoized main layout structure to prevent unnecessary re-renders
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <SideNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        onCollapse={handleToggleSidebar}
        isSectionAdmin={isSectionAdmin}
      />
      
      <main className={`
        flex-1 overflow-y-auto w-full transition-all duration-300
        ${isMobileView ? 'pt-16' : isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        <div className="max-w-full mx-auto p-3 sm:p-5 lg:p-6">
          <header className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'tasks' && 'Task Management (Legacy)'}
                  {activeTab === 'task-management-v2' && 'Task Management'}
                  {activeTab === 'announcements' && 'Announcements'}
                  {activeTab === 'teachers' && 'Teacher Management'}
                  {activeTab === 'courses' && 'Course Management'}
                  {activeTab === 'study-materials' && 'Study Materials'}
                  {activeTab === 'lecture-slides' && 'Lecture Slides'}
                  {activeTab === 'routine' && 'Routine Management'}
                </h1>
                {isSectionAdmin && sectionName && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    Section Admin: {sectionName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
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
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}