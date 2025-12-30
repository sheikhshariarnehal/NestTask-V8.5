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

// Loading skeleton component with memoization for better performance
const TasksSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:max-w-4xl lg:max-w-5xl md:mx-auto">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse bg-white dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50 h-48">
        <div className="p-4 h-full flex flex-col">
          <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="w-4/5 h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="w-2/3 h-3 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between">
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    ))}
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

  return (
    <div
      onClick={onClick}
      className={`
        group h-full bg-white dark:bg-gray-800/90 rounded-lg
        shadow-sm hover:shadow-lg
        border border-gray-100 dark:border-gray-700/50
        hover:border-blue-200 dark:hover:border-blue-600/50
        relative overflow-hidden ${preventTaskSelection ? '' : 'cursor-pointer'}
        transition-all duration-200
        transform ${preventTaskSelection ? '' : 'hover:-translate-y-1'}
        flex flex-col
        ${task.status === 'completed' 
          ? 'opacity-80 hover:opacity-95' 
          : isOverdue
            ? 'border-l-[3px] border-l-red-500' 
            : ''
        }
      `}
    >
      <div className="p-4 flex-grow flex flex-col">
        {/* Header Section */}
        <div className="flex items-start mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <h3 className={`
              text-base font-semibold leading-tight truncate
              ${task.status === 'completed'
                ? 'text-gray-500 dark:text-gray-400 line-through'
                : isOverdue
                  ? 'text-red-800 dark:text-red-300'
                  : 'text-gray-800 dark:text-gray-100'
              }
            `}>
              {task.name}
            </h3>
            {task.isAdminTask && (
              <div className="flex-shrink-0 p-0.5 mt-0.5">
                <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              </div>
            )}
            {hasAttachments && (
              <div className="flex-shrink-0 p-0.5 mt-0.5">
                <Paperclip className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className={`
          text-sm leading-relaxed line-clamp-2 mb-4 flex-grow
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
          <div className="flex items-center gap-1.5">
            <Calendar className={`
              w-3.5 h-3.5
              ${isOverdue && !task.status 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
              }`} 
            />
            <span className={`
              text-xs font-medium
              ${isOverdue && !task.status 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
              }`
            }>
              Due: {format(dueDate, 'MMM d')}
            </span>
          </div>
          
          {/* Status Badge and Category Tag */}
          <div className="flex items-center gap-2">
            {/* Status Badge - only show for Completed or Overdue */}
            {(task.status === 'completed' || isOverdue) && (
              <span className={`
                inline-flex items-center gap-1
                px-2 py-0.5
                text-[10px] font-medium
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
              inline-flex items-center gap-1.5
              px-2.5 py-0.5
              text-[10px] font-medium tracking-wide
              rounded-md border
              ${categoryInfo.color.replace('bg-', 'bg-opacity-75 bg-').replace('text-', 'text-opacity-90 text-')}
              transition-all duration-200
              shadow-sm backdrop-blur-sm
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
}

export function UpcomingPage({ tasks: propTasks }: UpcomingPageProps) {
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
  
  // Add caches for performance improvement
  const descriptionCache = useRef<Map<string, string>>(new Map());
  const filteredTasksCache = useRef<Map<string, Task[]>>(new Map());

  // Update tasks when prop or fetched tasks change
  useEffect(() => {
    setTasks(propTasks || allTasks || []);
  }, [propTasks, allTasks]);

  // Clear loading state if stuck for too long
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          console.warn('Loading state stuck for too long, forcing refresh');
          refreshTasks();
        }
      }, 10000); // 10 seconds timeout
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, refreshTasks]);

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

  // Optimize task filtering for selected date with better memoization
  const filteredTasks = useMemo(() => {
    // Early return if no tasks
    if (!tasks || tasks.length === 0) return [];
    
    // Extract date components once for more efficient comparison
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    
    // Use efficient filtering with date component comparison instead of isSameDay
    return tasks.filter(task => {
        if (!task.dueDate) return false;
        
      try {
        const taskDate = parseISO(task.dueDate);
        return (
          taskDate.getFullYear() === selectedYear &&
          taskDate.getMonth() === selectedMonth &&
          taskDate.getDate() === selectedDay
        );
      } catch {
        return false;
      }
    });
  }, [tasks, selectedDate]);

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
        <div className="max-w-full md:max-w-5xl mx-auto px-2 md:px-6 mb-6">
          <div className="animate-pulse flex items-center justify-between mb-4 py-3">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-7 gap-2 md:gap-3 lg:gap-4 px-0 md:px-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div 
                key={i}
                className="w-full aspect-square md:aspect-[3/4] p-1.5 md:p-3 lg:p-4 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
              />
            ))}
          </div>
        </div>
        <TasksSkeleton />
      </div>
    );
  }

  // Show actual loading indicator for non-initial loads
  if (loading && !isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 flex items-center justify-center">
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
        <div className="flex items-center justify-between px-1.5 py-2 min-h-[40px]">
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200 whitespace-nowrap"
          >
            <div className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></div>
            Today
          </button>

          <span 
            className="text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors px-2 whitespace-nowrap"
            onClick={() => setIsMonthlyCalendarOpen(true)}
          >
            {cachedFormat(selectedDate, 'MMM yyyy')}
          </span>

          <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-md h-6 overflow-hidden">
            <button
              onClick={() => {
                const newDate = addDays(selectedDate, -7);
                setSelectedDate(newDate);
              }}
              className="h-full px-1 text-gray-600 hover:text-blue-600 hover:bg-white/90 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700/90 transition-all duration-200 border-r border-gray-200 dark:border-gray-700"
              aria-label="Previous week"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => {
                const newDate = addDays(selectedDate, 7);
                setSelectedDate(newDate);
              }}
              className="h-full px-1 text-gray-600 hover:text-blue-600 hover:bg-white/90 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700/90 transition-all duration-200"
              aria-label="Next week"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Date Boxes - Weekly Calendar */}
        <div className="pb-4 mb-2 mt-4">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 px-1 sm:px-2 md:px-6">
          {weekDays.map((day) => (
            <button
                key={day.day + day.weekDay}
              onClick={() => setSelectedDate(day.date)}
              className={`
                  relative flex flex-col items-center justify-center
                  h-16 sm:h-20 md:h-24 lg:h-28 w-full
                  p-1 sm:p-2 md:p-3 rounded-xl
                  border transition-all duration-150
                ${day.isSelected
                    ? 'bg-blue-500 border-blue-400 shadow-md text-white'
                  : day.isToday
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }
                  hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700
                  active:scale-95
              `}
            >
              {/* Weekday */}
              <span className={`
                  text-[10px] sm:text-xs font-medium tracking-wide
                ${day.isSelected
                  ? 'text-blue-100'
                  : day.isToday
                    ? 'text-blue-500 dark:text-blue-400'
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
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
