import { useState, useMemo, useEffect, useCallback, Suspense, lazy, useRef, memo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, isBefore, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { Crown, Calendar, Clock, Tag, CheckCircle2, AlertCircle, BookOpen, FileText, PenTool, FlaskConical, GraduationCap, CalendarDays, Folder, Activity, Building, Users, Paperclip } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import type { Task } from '../types';
import React from 'react';

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Format cache to prevent excessive formatting operations
const formatCache = new Map<string, string>();
const cachedFormat = (date: Date, formatStr: string): string => {
  const key = `${date.getTime()}_${formatStr}`;
  if (!formatCache.has(key)) {
    formatCache.set(key, format(date, formatStr));
    // Keep the cache size reasonable
    if (formatCache.size > 100) {
      const firstKey = formatCache.keys().next().value;
      if (firstKey) {
        formatCache.delete(firstKey);
      }
    }
  }
  return formatCache.get(key) as string;
};

// Lazy load heavy components with error boundaries
const TaskDetailsPopup = lazy(() => import('../components/task/TaskDetailsPopup').then(module => ({ default: module.TaskDetailsPopup })));
const MonthlyCalendar = lazy(() => import('../components/MonthlyCalendar').then(module => ({ default: module.MonthlyCalendar })));

// Enhanced loading skeleton component matching the exact UI layout
const TasksSkeleton = React.memo(() => (
  <div className="px-3 xs:px-4 md:max-w-4xl lg:max-w-5xl md:mx-auto pb-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="relative overflow-hidden bg-white dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50 border-l-[3px] border-l-blue-300 dark:border-l-blue-600"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="p-4 h-full flex flex-col">
            {/* Title skeleton - matching task title */}
            <div className="mb-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            </div>

            {/* Description skeleton - matching task description */}
            <div className="mb-4">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
            </div>

            {/* Footer skeleton - matching the exact layout */}
            <div className="flex items-center justify-between pt-2 mt-auto">
              {/* Due date skeleton */}
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" style={{ animationDelay: '150ms' }}></div>
              </div>
              
              {/* Category badge skeleton */}
              <div className="h-5 bg-blue-100 dark:bg-blue-900/30 rounded-md px-2.5 py-0.5 w-24 animate-pulse" style={{ animationDelay: '250ms' }}></div>
            </div>
          </div>

          {/* Shimmer effect overlay */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-gray-400/5 to-transparent"></div>
        </div>
      ))}
    </div>
  </div>
));

// Calendar skeleton component matching the exact UI
const CalendarSkeleton = React.memo(() => (
  <div className="max-w-full md:max-w-5xl mx-auto px-2 md:px-6 mb-6">
    {/* Date Navigation Skeleton - matching the arrow < January 2026 > layout */}
    <div className="flex items-center justify-between mb-4">
      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    </div>

    {/* Week Days Skeleton - matching WED 31, THU 01, etc. */}
    <div className="pb-4">
      <div className="grid grid-cols-7 gap-2 md:gap-3 px-2 md:px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i}
            className={`flex flex-col items-center justify-center h-16 sm:h-20 md:h-24 w-full p-2 md:p-3 rounded-lg animate-pulse ${
              i === 3 ? 'bg-blue-500/80' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Weekday abbreviation (WED, THU, etc.) */}
            <div className={`w-6 h-2.5 rounded mb-1 ${
              i === 3 ? 'bg-blue-200' : 'bg-gray-300 dark:bg-gray-600'
            }`}></div>
            {/* Day number (31, 01, etc.) */}
            <div className={`w-7 h-7 rounded ${
              i === 3 ? 'bg-blue-200' : 'bg-gray-300 dark:bg-gray-600'
            }`}></div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

// Memoized day button component
const DayButton = memo(({ 
  day, 
  onClick 
}: { 
  day: { date: Date; day: string; weekDay: string; isSelected: boolean; isToday: boolean; },
  onClick: () => void
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative group
        flex flex-col items-center justify-center
        w-full aspect-square
        p-1 sm:p-1.5 md:p-3 lg:p-4 rounded-lg sm:rounded-xl 
        border transition-all duration-200
        ${day.isSelected
          ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 border-blue-400/50 shadow-md shadow-blue-500/20 dark:shadow-blue-600/20 scale-[1.02] -translate-y-0.5 md:scale-105'
          : day.isToday
          ? 'bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-50 border-blue-200/70 dark:from-blue-900/50 dark:via-indigo-900/40 dark:to-purple-900/50 dark:border-blue-700/50'
          : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50'
        }
        hover:shadow-md hover:-translate-y-0.5
        hover:border-blue-300/70 dark:hover:border-blue-600/70
        active:scale-95 touch-manipulation
        md:hover:shadow-lg md:hover:-translate-y-1
      `}
    >
      {/* Weekday */}
      <span className={`
        text-[10px] sm:text-xs md:text-sm font-semibold tracking-wide
        transition-colors duration-200
        ${day.isSelected
          ? 'text-blue-100'
          : day.isToday
          ? 'text-blue-600/90 dark:text-blue-400'
          : 'text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400'
        }
        mb-0.5 sm:mb-1 md:mb-2
      `}>
        {day.weekDay}
      </span>

      {/* Day Number */}
      <span className={`
        text-base sm:text-lg md:text-3xl lg:text-4xl font-bold 
        transition-colors duration-200
        ${day.isSelected
          ? 'text-white'
          : day.isToday
          ? 'text-blue-600/90 dark:text-blue-400'
          : 'text-gray-700 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-400'
        }
      `}>
        {day.day}
      </span>

      {/* Today Indicator */}
      {day.isToday && !day.isSelected && (
        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 animate-pulse shadow-lg shadow-blue-500/50"></div>
        </div>
      )}

      {/* Selected Indicator */}
      {day.isSelected && (
        <div className="absolute inset-0 rounded-lg sm:rounded-xl ring-2 ring-blue-400/40 dark:ring-blue-500/40 animate-pulse"></div>
      )}
    </button>
  );
});

// Memoized task card component
const TaskCard = memo(({ 
  task, 
  status, 
  categoryInfo, 
  hasAttachments, 
  cleanTaskDescription,
  onClick,
  preventTaskSelection
}: { 
  task: Task, 
  status: any, 
  categoryInfo: any, 
  hasAttachments: boolean, 
  cleanTaskDescription: (desc: string) => string,
  onClick: () => void,
  preventTaskSelection: boolean
}) => {
  const dueDate = parseISO(task.dueDate);
  const currentDate = new Date();
  const isOverdue = isBefore(endOfDay(dueDate), startOfDay(currentDate));

  // Determine left border color based on category
  const getLeftBorderColor = () => {
    if (task.status === 'completed') return 'border-l-green-500/80';
    if (isOverdue) return 'border-l-red-500/80';
    
    const colors: Record<string, string> = {
      presentation: 'border-l-purple-500/80',
      project: 'border-l-blue-500/80',
      assignment: 'border-l-indigo-500/80',
      quiz: 'border-l-emerald-500/80',
      'lab-report': 'border-l-red-500/80',
      'lab-final': 'border-l-yellow-500/80',
      'lab-perf': 'border-l-amber-500/80',
      documents: 'border-l-sky-500/80'
    };
    
    return colors[task.category.toLowerCase()] || 'border-l-gray-300 dark:border-l-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className={`
        group h-full bg-white dark:bg-gray-800/90 rounded-lg
        shadow-sm hover:shadow-md
        border border-gray-100 dark:border-gray-700/50
        relative overflow-hidden ${preventTaskSelection ? '' : 'cursor-pointer'}
        transition-all duration-200
        transform ${preventTaskSelection ? '' : 'hover:-translate-y-0.5'}
        flex flex-col
        border-l-[3px] ${getLeftBorderColor()}
        ${task.status === 'completed' ? 'opacity-80' : ''}
      `}
    >
      <div className="p-4 flex-grow flex flex-col">
        {/* Header Section */}
        <div className="flex items-start mb-2 sm:mb-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <h3 className={`
              text-sm sm:text-base font-semibold leading-tight flex-1
              ${task.status === 'completed'
                ? 'text-gray-500 dark:text-gray-400 line-through'
                : isOverdue
                  ? 'text-red-800 dark:text-red-300'
                  : 'text-gray-800 dark:text-gray-100'
              }
            `}>
              {task.name}
            </h3>
            {hasAttachments && (
              <div className="flex-shrink-0 p-0.5 mt-0.5">
                <Paperclip className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className={`
          text-[11px] xs:text-xs sm:text-sm leading-relaxed line-clamp-2 xs:line-clamp-3 sm:line-clamp-2 mb-3 sm:mb-4 flex-grow
          ${task.status === 'completed'
            ? 'text-gray-500 dark:text-gray-400'
            : isOverdue
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-600 dark:text-gray-300'
          }
        `}>
          {cleanTaskDescription(task.description)}
        </p>

        {/* Footer Section */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
          {/* Due Date */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Calendar className={`
              w-3 h-3 sm:w-3.5 sm:h-3.5
              ${isOverdue && !task.status 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
              }`} 
            />
            <span className={`
              text-[10px] sm:text-xs font-medium
              ${isOverdue && !task.status 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
              }`
            }>
              Due: {format(dueDate, 'MMM d')}
            </span>
          </div>
          
          {/* Status Badge and Category Tag */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Status Badge - only show for Completed or Overdue */}
            {(task.status === 'completed' || isOverdue) && (
              <span className={`
                inline-flex items-center gap-1
                px-1.5 sm:px-2 py-0.5
                text-[9px] sm:text-[10px] font-medium
                rounded-full
                ${task.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }
                ${isOverdue && task.status !== 'completed' ? 'animate-pulse' : ''}
              `}>
                {status.icon}
                <span>{status.label}</span>
              </span>
            )}
            
            {/* Category Tag */}
            <span className={`
              inline-flex items-center gap-1 sm:gap-1.5
              px-2 sm:px-2.5 py-0.5
              text-[9px] sm:text-[10px] font-medium tracking-wide
              rounded-md border
              ${categoryInfo.color.replace('bg-', 'bg-opacity-75 bg-').replace('text-', 'text-opacity-90 text-')}
              transition-all duration-200
              shadow-sm
              border-opacity-30
              ${categoryInfo.color.includes('blue') ? 'border-blue-200 dark:border-blue-700' :
                categoryInfo.color.includes('purple') ? 'border-purple-200 dark:border-purple-700' :
                categoryInfo.color.includes('emerald') ? 'border-emerald-200 dark:border-emerald-700' :
                categoryInfo.color.includes('indigo') ? 'border-indigo-200 dark:border-indigo-700' :
                categoryInfo.color.includes('green') ? 'border-green-200 dark:border-green-700' :
                categoryInfo.color.includes('red') ? 'border-red-200 dark:border-red-700' :
                categoryInfo.color.includes('yellow') ? 'border-yellow-200 dark:border-yellow-700' :
                categoryInfo.color.includes('amber') ? 'border-amber-200 dark:border-amber-700' :
                categoryInfo.color.includes('sky') ? 'border-sky-200 dark:border-sky-700' :
                'border-gray-200 dark:border-gray-700'}
              hover:shadow-md group-hover:shadow-md
            `}>
              <div className="flex-shrink-0">
                {categoryInfo.icon}
              </div>
              <span className="capitalize whitespace-nowrap">
                {task.category.replace('-', ' ')}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

interface UpcomingPageProps {
  tasks?: Task[];
  openTaskId?: string | null;
  onOpenTaskIdConsumed?: () => void;
}

export function UpcomingPage({ tasks: propTasks, openTaskId, onOpenTaskIdConsumed }: UpcomingPageProps) {
  const { user } = useAuth();
  const { tasks: allTasks, loading, error: taskError, updateTask, refreshTasks } = useTasks(propTasks ? undefined : user?.id);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isMonthlyCalendarOpen, setIsMonthlyCalendarOpen] = useState(false);
  const [preventTaskSelection, setPreventTaskSelection] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isPageActive, setIsPageActive] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const initialRenderRef = useRef(true);
  const lastFocusTimeRef = useRef(Date.now());
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // Absolute safety timer for initial load - 8 seconds max on Android Cold Start
  useEffect(() => {
    if (isInitialLoad) {
      const initialSafetyTimer = setTimeout(() => {
        if (isInitialLoad) {
          console.log('[UpcomingPage] Absolute safety timer triggered - forcing content show');
          setIsInitialLoad(false);
        }
      }, 8000);
      
      return () => clearTimeout(initialSafetyTimer);
    }
  }, [isInitialLoad]);

  // Update tasks when prop or fetched tasks change
  useEffect(() => {
    setTasks(propTasks || allTasks || []);
  }, [propTasks, allTasks]);

  // Open task details popup when requested (e.g., from push notification click)
  useEffect(() => {
    console.log('[UpcomingPage] openTaskId changed:', openTaskId);
    if (!openTaskId) return;

    const allTasksList = propTasks || allTasks || [];
    console.log('[UpcomingPage] Searching for task:', openTaskId, 'in', allTasksList.length, 'tasks');
    
    // If tasks haven't loaded yet, don't consume the openTaskId - just wait
    if (allTasksList.length === 0 && loading) {
      console.log('[UpcomingPage] Tasks still loading, will retry when tasks are available...');
      return; // Don't consume the taskId, let it retry when loading completes
    }
    
    const taskToOpen = allTasksList.find(t => t.id === openTaskId);
    
    if (taskToOpen) {
      console.log('[UpcomingPage] Found task, opening popup:', taskToOpen.name);
      setSelectedTask(taskToOpen);

      // Optional: move calendar selection to the task date if possible
      if (taskToOpen.dueDate) {
        try {
          const d = typeof taskToOpen.dueDate === 'string' ? parseISO(taskToOpen.dueDate) : new Date(taskToOpen.dueDate);
          if (!Number.isNaN(d.getTime())) {
            setSelectedDate(d);
          }
        } catch {
          // Ignore date parsing failures; popup still opens.
        }
      }
      // Only consume the taskId when we successfully found and opened it
      onOpenTaskIdConsumed?.();
    } else {
      console.log('[UpcomingPage] Task not found:', openTaskId);
      // Only consume if we're sure tasks have loaded (not still loading)
      if (!loading) {
        console.log('[UpcomingPage] Tasks loaded but task not found. Waiting 2s before giving up...');
        // Add a delay before giving up, to allow for any final updates or race conditions
        const timer = setTimeout(() => {
          // Check one last time if the task exists in the current list (in case it updated during timeout)
          // Note: We use the ref or state here if we could, but inside timeout we rely on the fact that
          // if tasks updated, the effect would have re-run and cleared this timeout.
          console.log('[UpcomingPage] Giving up on finding task:', openTaskId);
          onOpenTaskIdConsumed?.();
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [openTaskId, propTasks, allTasks, loading]);

  // Clear loading state if stuck for too long
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          console.warn('Loading state stuck for too long, forcing refresh');
          refreshTasks();
          // Force clear initial load after timeout to show content (even if empty)
          setIsInitialLoad(false);
        }
      }, 10000); // 10 seconds timeout
    } else {
      // If loading is false, successfully loaded
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, refreshTasks, isInitialLoad]);

  // Enhanced retry mechanism
  const retryLoadTasks = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying task load attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      setRetryCount(prev => prev + 1);
      
      retryTimeoutRef.current = setTimeout(() => {
        refreshTasks();
      }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
    } else {
      console.error('Max retry attempts reached');
      setOperationError('Failed to load tasks after multiple attempts. Please try again later.');
    }
  }, [retryCount, refreshTasks]);

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced error handling for task updates
  useEffect(() => {
    if (taskError) {
      console.error('Task error occurred:', taskError);
      setOperationError(taskError);
      retryLoadTasks();
    }
  }, [taskError, retryLoadTasks]);

  // Enhanced page visibility and focus handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsPageActive(isVisible);
      
      if (isVisible) {
        const now = Date.now();
        const timeSinceLastFocus = now - lastFocusTimeRef.current;
        console.log('Page became visible after', timeSinceLastFocus / 1000, 'seconds');
        
        // Refresh if page was hidden for more than 30 seconds
        if (timeSinceLastFocus > 30000) {
          console.log('Refreshing tasks due to long visibility change');
          refreshTasks();
        }
        
        lastFocusTimeRef.current = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial load handling
    if (initialRenderRef.current) {
      console.log('Initial render, ensuring tasks are loaded');
      initialRenderRef.current = false;
      
      if (!loading && (!allTasks || allTasks.length === 0)) {
        console.log('No tasks available on mount, triggering load');
        refreshTasks();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshTasks, loading, allTasks]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
      refreshTasks();
  }, [refreshTasks]);

  // Utility function to clean task description
  const cleanTaskDescription = useCallback((description: string): string => {
    if (!description) return '';
    
    // Clean multiple patterns at once for better performance
    const cleanedText = description
      .replace(/\*This task is assigned to section ID: [0-9a-f-]+\*/g, '') // Remove section ID
      .replace(/\[([^\]]+)\]\(attachment:[^)]+\)/g, '') // Remove attachment links
      .replace(/\*\*Attachments:\*\*.*?\)/g, '') // Remove attachment references
      .replace(/AS \*\*Attachments:\*\*.*?$/gm, '') // Remove AS attachments format
      .replace(/Attachments:.*?$/gm, '') // Remove other attachment references
      .trim(); // Clean up whitespace
    
    return cleanedText;
  }, []);

  // Check if a task has attachments
  const hasAttachments = useCallback((description: string): boolean => {
    const attachmentPatterns = [
      /\[([^\]]+)\]\(attachment:[^)]+\)/,
      /\*\*Attachments:\*\*/,
      /AS \*\*Attachments:\*\*/,
      /Attachments:/
    ];
    
    return attachmentPatterns.some(pattern => pattern.test(description));
  }, []);

  // Memoized and optimized formatDate function - using cached format for performance
  const formatDate = useCallback((date: Date): string => {
    return cachedFormat(date, 'yyyy-MM-dd');
  }, []);

  // Optimized function to check if two dates represent the same day
  const isSameDayOptimized = useCallback((date1: Date, date2: Date): boolean => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }, []);

  // Generate week days with current date in middle
  const weekDays = useMemo(() => {
    const start = addDays(selectedDate, -3); // Start 3 days before selected date
    const today = new Date();
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        day: cachedFormat(date, 'dd'),
        weekDay: cachedFormat(date, 'EEE'),
        isSelected: isSameDayOptimized(date, selectedDate),
        isToday: isSameDayOptimized(date, today)
      };
    });
  }, [selectedDate, isSameDayOptimized, cachedFormat]);

  // Build date-indexed cache for O(1) task lookup - major performance improvement
  const tasksByDate = useMemo(() => {
    if (!tasks || tasks.length === 0) return new Map<string, Task[]>();
    
    const index = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (!task.dueDate) return;
      
      try {
        const taskDate = parseISO(task.dueDate);
        const dateKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
        
        if (!index.has(dateKey)) {
          index.set(dateKey, []);
        }
        index.get(dateKey)!.push(task);
      } catch {
        // Skip invalid dates
      }
    });
    
    return index;
  }, [tasks]);

  // O(1) lookup instead of O(n) filter - instant date switching
  const filteredTasks = useMemo(() => {
    const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return tasksByDate.get(dateKey) || [];
  }, [tasksByDate, selectedDate]);

  // Get task status - memoized utility function
  const getTaskStatus = useCallback((task: Task) => {
    const dueDate = parseISO(task.dueDate);
    const currentDate = new Date();
    const isOverdue = isBefore(endOfDay(dueDate), startOfDay(currentDate));

    if (task.status === 'completed') {
      return {
        label: 'Completed',
        color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 ring-green-500/20',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      };
    }
    
    if (isOverdue) {
      return {
        label: 'Overdue',
        color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 ring-red-500/20',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        cardStyle: 'border-l-[3px] border-l-red-500 bg-red-50/30 dark:bg-red-900/10'
      };
    }

    return {
      label: 'In Progress',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 ring-blue-500/20',
      icon: <Clock className="w-3.5 h-3.5" />
    };
  }, []);

  // Cache the category icons and colors with useMemo
  const categoryIcons = useMemo(() => ({
    task: <BookOpen className="w-3 h-3 md:w-4 md:h-4" />,
    presentation: <PenTool className="w-3 h-3 md:w-4 md:h-4" />,
    project: <Folder className="w-3 h-3 md:w-4 md:h-4" />,
    assignment: <FileText className="w-3 h-3 md:w-4 md:h-4" />,
    quiz: <BookOpen className="w-3 h-3 md:w-4 md:h-4" />,
    'lab-report': <FlaskConical className="w-3 h-3 md:w-4 md:h-4" />,
    'lab-final': <GraduationCap className="w-3 h-3 md:w-4 md:h-4" />,
    'lab-performance': <Activity className="w-3 h-3 md:w-4 md:h-4" />,
    documents: <FileText className="w-3 h-3 md:w-4 md:h-4" />,
    blc: <Building className="w-3 h-3 md:w-4 md:h-4" />,
    groups: <Users className="w-3 h-3 md:w-4 md:h-4" />,
    default: <Tag className="w-3 h-3 md:w-4 md:h-4" />
  }), []);

  const categoryColors = useMemo(() => ({
    task: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    presentation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    project: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    assignment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    quiz: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    'lab-report': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    'lab-final': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    'lab-performance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    documents: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300',
    blc: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    groups: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
  }), []);

  // Get category info with icon and color
  const getCategoryInfo = useCallback((category: string) => {
    const categoryKey = category as keyof typeof categoryIcons || 'default';
    return {
      icon: categoryIcons[categoryKey] || categoryIcons.default,
      color: categoryColors[categoryKey] || categoryColors.default
    };
  }, [categoryIcons, categoryColors]);

  // Handle task status update
  const handleStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      setIsUpdating(true);
      setOperationError(null);

      // Find the task being updated
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found in current list');
      }

      // Store the original status
      const originalStatus = taskToUpdate.status;

      try {
        // Update the task
        const updatedTask = await updateTask(taskId, { status: newStatus });
        
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        );

        // Update selected task if it's the one being updated
        if (selectedTask?.id === taskId) {
          setSelectedTask(updatedTask);
        }
      } catch (error) {
        // Revert to original status on error
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: originalStatus } : task
          )
        );
        throw error;
      }
    } catch (error: any) {
      setOperationError('Failed to update task status. Please try again.');
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle date selection with optimization
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTask(null);
  }, []);

  // Optimize render cycle by only updating date in URL when needed
  useEffect(() => {
    const updateUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('selectedDate');
        const currentDateStr = formatDate(selectedDate);
        
        if (dateParam !== currentDateStr) {
          params.set('selectedDate', currentDateStr);
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({ path: newUrl }, '', newUrl);
        }
      } catch (error) {
        console.error('Error updating URL parameter:', error);
      }
    };
    
    // Debounce URL updates to avoid excessive history entries
    const timeoutId = setTimeout(updateUrl, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedDate, formatDate]);

  // Render loading skeleton during initial load
  if (isInitialLoad && loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4">
        <CalendarSkeleton />
        <TasksSkeleton />
      </div>
    );
  }

  // Show actual loading indicator for non-initial loads
  if (loading && !isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4">
        <CalendarSkeleton />
        <TasksSkeleton />
      </div>
    );
  }

  // Show a different message when we have no tasks but we're not loading
  if (!loading && (!tasks || tasks.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4">
        <div className="max-w-full md:max-w-5xl mx-auto px-2 md:px-6">
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">No tasks available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Try refreshing the page or check back later
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Error Alert */}
      {(taskError || operationError) && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          <p className="text-sm font-medium">{taskError || operationError}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {(isUpdating || (loading && !isInitialLoad)) && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl animate-scale-in">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {isUpdating ? 'Updating task...' : 'Loading tasks...'}
            </p>
          </div>
        </div>
      )}

      {/* Calendar Strip */}
      <div className="max-w-full md:max-w-5xl mx-auto px-2 md:px-6 mb-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150 active:scale-95"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button 
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-98"
            onClick={() => setIsMonthlyCalendarOpen(true)}
            aria-label="Open calendar"
          >
            <Calendar className="w-4 h-4" />
            <span className="whitespace-nowrap">{cachedFormat(selectedDate, 'MMMM yyyy')}</span>
          </button>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150 active:scale-95"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Date Boxes - Weekly Calendar */}
        <div className="pb-4">
          <div className="grid grid-cols-7 gap-2 md:gap-3 px-2 md:px-4">
          {weekDays.map((day) => (
            <button
              key={day.day + day.weekDay}
              onClick={() => setSelectedDate(day.date)}
              className={`
                flex flex-col items-center justify-center
                h-16 sm:h-20 md:h-24 w-full
                p-2 md:p-3 rounded-lg
                border transition-all duration-200
                ${day.isSelected
                  ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 text-white scale-105'
                  : day.isToday
                  ? 'bg-blue-50/50 border-blue-200/60 dark:bg-blue-900/20 dark:border-blue-700/50'
                  : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
                }
                hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md
                active:scale-95
              `}
            >
              {/* Weekday */}
              <span className={`
                text-[10px] sm:text-xs font-semibold tracking-wider uppercase
                ${day.isSelected
                  ? 'text-blue-100'
                  : day.isToday
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {day.weekDay}
              </span>

              {/* Day Number */}
              <span className={`
                text-xl sm:text-2xl md:text-3xl font-bold mt-1
                ${day.isSelected
                  ? 'text-white'
                  : day.isToday
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-800 dark:text-gray-200'
                }
              `}>
                {day.day}
              </span>
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Tasks List with Enhanced Cards */}
      <div className="px-3 xs:px-4 md:max-w-4xl lg:max-w-5xl md:mx-auto pb-8">
        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 md:gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                  key={task.id}
                task={task}
                status={getTaskStatus(task)}
                categoryInfo={getCategoryInfo(task.category)}
                hasAttachments={hasAttachments(task.description)}
                cleanTaskDescription={cleanTaskDescription}
                  onClick={() => {
                    if (!preventTaskSelection) {
                      setSelectedTask(task);
                    }
                  }}
                preventTaskSelection={preventTaskSelection}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">No tasks for {format(selectedDate, 'MMMM d')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isSameDayOptimized(selectedDate, new Date()) ? "You're all caught up for today!" : "Nothing scheduled for this day"}
            </p>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        </div>
      }>
        {selectedTask && (
          <TaskDetailsPopup
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onStatusUpdate={handleStatusUpdate}
            isUpdating={isUpdating}
          />
        )}
      </Suspense>

      {/* Monthly Calendar */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        </div>
      }>
        {isMonthlyCalendarOpen && (
          <MonthlyCalendar
            isOpen={isMonthlyCalendarOpen}
            onClose={() => setIsMonthlyCalendarOpen(false)}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedTask(null);
              setPreventTaskSelection(true);
              setTimeout(() => {
                setPreventTaskSelection(false);
              }, 1000);
              
              setSelectedDate(date);
              setIsMonthlyCalendarOpen(false);
              
              try {
                const params = new URLSearchParams(window.location.search);
                params.set('selectedDate', formatDate(date));
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
              } catch (error) {
                console.error('Error setting date parameter:', error);
              }
            }}
            tasks={tasks}
          />
        )}
      </Suspense>
    </div>
  );
}
