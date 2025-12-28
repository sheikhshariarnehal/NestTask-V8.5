import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import type { KeyboardEvent } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, addMonths, getDay, getYear, setYear } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Task } from '../types/task';

// Pre-defined animation variants for better performance
const overlayAnimationVariants = {
  hidden: { opacity: 0, scale: 1 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1 }
};

// Optimize transition properties for better performance
const transitionProps = { 
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1]
};

// Reduced motion animation variants - simplified for better rendering
const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

// Tooltip animation variants - simplified to prevent blurriness
const tooltipAnimationVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

// Animation variants for the badge - optimized to prevent blurriness
const badgeAnimationVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { 
      duration: 0.15,
      ease: "easeOut" 
    } 
  }
};

// Animation variants for day cell hover - optimized to prevent blurriness
const dayCellHoverVariants = {
  initial: { scale: 1 },
  hover: { scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
  tap: { scale: 0.98, transition: { duration: 0.1, ease: "easeOut" } }
};

// Weekday headers - defined outside component to prevent recreation
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
}

interface MonthlyCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
}

// Add the CalendarDay type and fix the month navigation handlers
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

// Wrap the component with memo to optimize renders
const MonthlyCalendarBase = ({ isOpen, onClose, selectedDate, onSelectDate, tasks }: MonthlyCalendarProps) => {
  const preferReducedMotion = useReducedMotion();
  
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  // Update current month when selectedDate changes
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);
  
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; transformOrigin?: string }>({ x: 0, y: 0 });
  const [focusedDateIndex, setFocusedDateIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'year'>('calendar');
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const calendarRef = useRef<HTMLDivElement>(null);
  const dayButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const isMobileRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  
  // Use useRef for caching to avoid re-renders
  const taskSummaryCacheRef = useRef<Map<string, TaskSummary>>(new Map());

  // Optimized date utilities
  const isSameDayOptimized = (date1: Date, date2: Date): boolean => {
    try {
      // Ensure we normalize both dates to handle any time/timezone differences
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    } catch (error) {
      console.error('Error comparing dates:', error);
      return false;
    }
  };

  // Generate a consistent date key for maps and lookups
  const generateDateKey = useCallback((date: Date): string => {
    try {
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    } catch (error) {
      console.error('Error generating date key:', error);
      return '';
    }
  }, []);

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  };

  const createNormalizedDate = (date: Date): Date => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, // Set noon to avoid any timezone issues
      0,
      0
    );
  };

  // Reset view mode when opening
  useEffect(() => {
    if (isOpen) {
      setViewMode('calendar');
      
      // Set current month to match selected date when opening
      setCurrentMonth(selectedDate);
      
      // Reset focus
      setFocusedDateIndex(null);
      
      // Set focus to the calendar container after a small delay
      setTimeout(() => {
        calendarRef.current?.focus();
      }, 100);
    }
  }, [isOpen, selectedDate]);

  // Get current year and generate years array for year selector
  const currentYear = getYear(new Date());
  const years = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, [currentYear]);

  const isMobileView = () => {
    return window.innerWidth < 768;
  };

  // Check if device is mobile and adjust UI accordingly
  useEffect(() => {
    // Set mobile flag based on screen width
    const handleResize = () => {
      isMobileRef.current = isMobileView();
    };

    // Initial check
    handleResize();

    // Add listener for resize
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Clear any pending timeouts
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      
      // Reset refs
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };
  }, []);

  // Create a task lookup map for faster retrieval - memoized
  const tasksByDate = useMemo(() => {
    // Use a performance optimization to avoid creating a new map each time
    const map = new Map<string, Task[]>();
    
    if (!tasks || tasks.length === 0) return map;
    
    // Pre-calculate date format function to avoid repeated calls
    const batchSize = 50; // Process tasks in batches for better perceived performance
    const batches = Math.ceil(tasks.length / batchSize);
    
    // Process tasks in batches for smoother rendering
    for (let b = 0; b < batches; b++) {
      const start = b * batchSize;
      const end = Math.min((b + 1) * batchSize, tasks.length);
      
      for (let i = start; i < end; i++) {
        const task = tasks[i];
        try {
          const taskDate = new Date(task.dueDate);
          // Create a consistent key format using our helper function
          const dateKey = generateDateKey(taskDate);
          
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          
          map.get(dateKey)!.push(task);
        } catch (error) {
          // Skip invalid dates
          console.error('Error creating task date key:', error);
        }
      }
    }
    
    return map;
  }, [tasks, generateDateKey]);

  // Get all days in the current month with padding - optimized computation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDayOfWeek = getDay(monthStart);
    const daysInMonth = monthEnd.getDate();
    
    // Pre-allocate array with exact size
    const totalDays = startDayOfWeek + daysInMonth;
    const days: (Date | null)[] = new Array(totalDays);
    
    // Fill in empty spaces for the first week
    days.fill(null, 0, startDayOfWeek);
    
    // Create base date values once
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    
    // Fill in actual days efficiently
    for (let i = 0; i < daysInMonth; i++) {
      days[startDayOfWeek + i] = new Date(year, month, i + 1, 12, 0, 0);
    }
    
    return days;
  }, [currentMonth]);

  // Get tasks summary for a specific date - optimized with the task map
  const getTaskSummary = useCallback((date: Date | null): TaskSummary => {
    if (!date) return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    
    // Quick return if no tasks for better performance
    if (!tasksByDate.size) {
      return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    }
    
    // Get tasks for this date from the map (much faster lookup)
    const dateKey = generateDateKey(date);
    const dayTasks = tasksByDate.get(dateKey);
    
    // Fast early return if no tasks for this date
    if (!dayTasks || dayTasks.length === 0) {
      return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    }

    // Optimize counting by using pre-cached values if available
    // Cache task summaries for dates to improve performance when repeatedly calling
    if (taskSummaryCacheRef.current.has(dateKey)) {
      return taskSummaryCacheRef.current.get(dateKey)!;
    }

    // Count in a single loop with optimized checks
    let completed = 0;
    let overdue = 0;
    let inProgress = 0;
    const now = new Date();
    const nowTime = now.getTime();
    const taskCount = dayTasks.length;
    
    for (let i = 0; i < taskCount; i++) {
      const task = dayTasks[i];
      if (task.status === 'completed') {
        completed++;
        continue; // Skip date comparison for completed tasks
      }
      
      try {
        // Use timestamp comparison instead of date object comparison
        const taskDueDate = new Date(task.dueDate);
        if (taskDueDate.getTime() < nowTime) {
          overdue++;
        } else {
          inProgress++;
        }
      } catch {
        inProgress++; // Default to in-progress on error
      }
    }

    const summary = {
      total: taskCount,
      completed,
      overdue,
      inProgress
    };
    
    // Cache the summary for better performance
    taskSummaryCacheRef.current.set(dateKey, summary);
    
    return summary;
  }, [tasksByDate, generateDateKey]);

  // Get tasks for a specific date
  const getTasksForDate = useCallback((date: Date | null): Task[] => {
    if (!date) return [];
    
    // Quick return if no tasks
    if (!tasksByDate.size) {
      return [];
    }
    
    // Get tasks for this date from the map - ensure exact format match with tasksByDate creation
    const dateKey = generateDateKey(date);
    
    // Debug: Check if the key exists in the map
    const result = tasksByDate.get(dateKey) || [];
    
    // If no results but we expect some, try alternative formats
    if (result.length === 0) {
      // Fall back to direct date comparison which is more accurate but slower
      return tasks.filter(task => {
        try {
          const taskDate = new Date(task.dueDate);
          return isSameDayOptimized(taskDate, date);
        } catch (error) {
          return false;
        }
      });
    }
    
    return result;
  }, [tasksByDate, tasks, isSameDayOptimized, generateDateKey]);

  // Month navigation handlers - fixed to avoid stale closures
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, -1));
    // Reset focus index to prevent issues
    setFocusedDateIndex(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
    // Reset focus index to prevent issues
    setFocusedDateIndex(null);
  }, []);

  // Toggle year selector
  const toggleYearSelector = useCallback(() => {
    setViewMode(prev => prev === 'calendar' ? 'year' : 'calendar');
  }, []);

  // Handle change year - optimized
  const handleYearChange = useCallback((year: number) => {
    const newDate = new Date(year, currentMonth.getMonth(), 1, 12, 0, 0);
    setCurrentMonth(newDate);
    setViewMode('calendar');
    // Reset focus
    setFocusedDateIndex(null);
  }, [currentMonth]);

  // Handle mouse enter for tooltip
  const handleMouseEnter = useCallback((date: Date, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isMobileRef.current) {
      setHoveredDate(date);
      
      // Calculate position based on the button position
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Adjust y position to avoid tooltip going above viewport
      const spaceNeeded = 220; // Approximate height of tooltip
      const yPosition = rect.top - 10;
      
      // If tooltip would go out of viewport, position it below the date instead
      const adjustedY = yPosition < spaceNeeded ? rect.bottom + 10 : yPosition;
      const transformOrigin = yPosition < spaceNeeded ? 'translateY(0)' : 'translate(-50%, -100%)';
      
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: adjustedY,
        transformOrigin
      });
    }
  }, []);

  // Handle mouse leave for tooltip
  const handleMouseLeave = useCallback(() => {
    setHoveredDate(null);
  }, []);

  // Optimize touch event handling with passive listeners and pointer events
  const touchHandlerProps = useMemo(() => ({
    onPointerDown: (e: React.PointerEvent) => {
      touchStartXRef.current = e.clientX;
      touchStartYRef.current = e.clientY;
    },
    onPointerMove: (e: React.PointerEvent) => {
      // Only update on significant movement to avoid unnecessary work
      if (touchStartXRef.current !== null && 
          Math.abs(e.clientX - touchStartXRef.current) > 10) {
        setHoveredDate(null);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (touchStartXRef.current !== null) {
        const deltaX = e.clientX - touchStartXRef.current;
        const deltaY = touchStartYRef.current !== null ? e.clientY - touchStartYRef.current : 0;
        
        // Adaptive threshold based on screen size
        const swipeThreshold = Math.min(window.innerWidth * 0.15, 80);
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
          // Use requestAnimationFrame for smoother animations
          requestAnimationFrame(() => {
            if (deltaX > 0) {
              handlePrevMonth();
            } else {
              handleNextMonth();
            }
          });
        }
      }
      
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    },
    // Add passive touch events for better performance
    style: { touchAction: 'pan-y' }
  }), [handlePrevMonth, handleNextMonth]);

  // Replace the old touch handlers with the optimized pointer event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Only update on significant movement
    if (touchStartXRef.current !== null && 
        Math.abs(e.touches[0].clientX - touchStartXRef.current) > 10) {
      setHoveredDate(null);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartXRef.current;
      const deltaY = touchEndY - touchStartYRef.current;
      
      // Adaptive threshold based on screen size
      const swipeThreshold = Math.min(window.innerWidth * 0.15, 80);
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        // Use requestAnimationFrame for smoother animations
        requestAnimationFrame(() => {
          if (deltaX > 0) {
            handlePrevMonth();
          } else {
            handleNextMonth();
          }
        });
      }
    }
    
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }, [handlePrevMonth, handleNextMonth]);

  // Handle date selection - optimized to prevent race conditions
  const handleDateSelection = useCallback((date: Date) => {
    try {
      // Create a normalized date to avoid timezone issues
      const selectedDate = createNormalizedDate(date);
      
      // Close immediately for better UX
      onClose();
      
      // Pass the normalized date to ensure consistency
      onSelectDate(selectedDate);
      
      // Dispatch event to prevent auto-task selection
      const preventAutoSelectEvent = new CustomEvent('preventAutoTaskSelect', { 
        detail: { date: selectedDate }
      });
      window.dispatchEvent(preventAutoSelectEvent);
    } catch (error) {
      console.error('Error selecting date:', error);
    }
  }, [onSelectDate, onClose]);

  // Optimize keyboard event handling with debouncing
  const handleContainerKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (viewMode !== 'calendar') return;
    
    // Handle month navigation instantly
    if ((e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) || e.key === 'PageUp') {
      handlePrevMonth();
      e.preventDefault();
      return;
    }
    
    if ((e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) || e.key === 'PageDown') {
      handleNextMonth();
      e.preventDefault();
      return;
    }
    
    if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
      return;
    }
    
    // For other keyboard navigation, use requestAnimationFrame for smoother updates
    switch (e.key) {
      case 'ArrowLeft':
        if (focusedDateIndex === null) {
          setFocusedDateIndex(15); // Choose a middle date
        } else {
          setFocusedDateIndex(prev => (prev === null ? 15 : Math.max(0, prev - 1)));
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (focusedDateIndex === null) {
          setFocusedDateIndex(15); // Choose a middle date
        } else {
          setFocusedDateIndex(prev => (prev === null ? 15 : Math.min(calendarDays.length - 1, prev + 1)));
        }
        e.preventDefault();
        break;
      case 'ArrowUp':
        if (focusedDateIndex === null) {
          setFocusedDateIndex(15); // Choose a middle date
        } else {
          setFocusedDateIndex(prev => (prev === null ? 15 : Math.max(0, prev - 7)));
        }
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (focusedDateIndex === null) {
          setFocusedDateIndex(15); // Choose a middle date
        } else {
          setFocusedDateIndex(prev => (prev === null ? 15 : Math.min(calendarDays.length - 1, prev + 7)));
        }
        e.preventDefault();
        break;
      case 'Home':
        setFocusedDateIndex(calendarDays.findIndex(d => d !== null));
        e.preventDefault();
        break;
      case 'End':
        setFocusedDateIndex(calendarDays.length - 1);
        e.preventDefault();
        break;
    }
    
    // Only call focus logic once per animation frame to avoid layout thrashing
    if (focusedDateIndex !== null) {
      requestAnimationFrame(() => {
        if (dayButtonsRef.current[focusedDateIndex]) {
          dayButtonsRef.current[focusedDateIndex]?.focus();
        }
      });
    }
  }, [focusedDateIndex, calendarDays, handlePrevMonth, handleNextMonth, viewMode, onClose]);

  // Updated keyboard handler for the correct element type
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        const date = calendarDays[index];
        if (date) {
          handleDateSelection(date);
          e.preventDefault();
        }
        break;
    }
  }, [calendarDays, handleDateSelection]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset dayButtonsRef when calendar days change
  useEffect(() => {
    dayButtonsRef.current = dayButtonsRef.current.slice(0, calendarDays.length);
  }, [calendarDays.length]);

  // Handle today button - optimized
  const handleTodayClick = useCallback(() => {
    const today = new Date();
    const normalizedToday = createNormalizedDate(today);
    
    // Set to current month
    setCurrentMonth(normalizedToday);
    
    // Select today's date
    handleDateSelection(normalizedToday);
  }, [handleDateSelection]);

  // Format task name for display in tooltip
  const formatTaskName = useCallback((name: string): string => {
    return name.length > 30 ? name.substring(0, 30) + '...' : name;
  }, []);

  // Format category name for cleaner display
  const formatCategoryName = useCallback((category: string): string => {
    return category
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Render the tooltip for a hovered date - with optimized rendering
  const renderTooltip = useMemo(() => {
    if (!hoveredDate) return null;
    
    // Don't show tooltip on small mobile screens
    if (isMobileRef.current && window.innerWidth < 480) return null;
    
    const tasks = getTasksForDate(hoveredDate);
    if (tasks.length === 0) return null;
    
    // Determine if tooltip is showing above or below the date
    const showingBelow = tooltipPosition.transformOrigin === 'translateY(0)';
    
    // Virtualize long task lists - only render visible items
    const maxVisibleTasks = isMobileRef.current ? 5 : 10; // Limit number of tasks rendered for performance
    const displayTasks = tasks.length > maxVisibleTasks ? tasks.slice(0, maxVisibleTasks) : tasks;
    const hasMoreTasks = tasks.length > maxVisibleTasks;
    
    const tooltipX = Math.round(tooltipPosition.x);
    const tooltipY = Math.round(tooltipPosition.y);
    
    return (
      <motion.div
        className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 sm:px-5 py-2 sm:py-3 text-left min-w-[180px] sm:min-w-[220px]"
        style={{ 
          top: `${tooltipY}px`, 
          left: `${tooltipX}px`,
          transform: tooltipPosition.transformOrigin || 'translate(-50%, -100%)',
          pointerEvents: 'none',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 5px 10px -5px rgba(0,0,0,0.05)',
          imageRendering: 'crisp-edges'
        }}
        variants={tooltipAnimationVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.15 }}
      >
        <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white mb-1 sm:mb-1.5 pb-1.5 sm:pb-2 border-b border-gray-100 dark:border-gray-700">
          {format(hoveredDate, 'MMMM d, yyyy')} - {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </div>
        <ul className="space-y-2 sm:space-y-3.5 max-h-[140px] sm:max-h-[170px] overflow-y-auto pt-1">
          {displayTasks.map(task => {
            // Get color based on task category - with optimized calculation
            const getDotColor = () => {
              const category = task.category.toLowerCase();
              
              // Direct category match for common types (faster than switch for most cases)
              if (category === 'quiz') return 'bg-blue-500';
              if (category === 'lab-report') return 'bg-red-500';
              if (category === 'project') return 'bg-emerald-500';
              
              // Pattern matching for types with similar naming
              if (category.includes('lab')) return 'bg-red-500';
              if (['quiz', 'data', 'science'].some(term => 
                category.includes(term) || task.name.toLowerCase().includes(term)
              )) return 'bg-blue-500';
              if (['project', 'research', 'development'].some(term => 
                category.includes(term) || task.name.toLowerCase().includes(term)
              )) return 'bg-emerald-500';
              
              return 'bg-gray-500';
            };
              
            return (
              <li key={task.id} className="flex items-start">
                <div className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full mt-0.5 mr-2 sm:mr-3 flex-shrink-0 ${getDotColor()}`} />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                    {formatTaskName(task.name)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                    {formatCategoryName(task.category)}
                  </span>
                </div>
              </li>
            );
          })}
          
          {/* Show indicator for more tasks */}
          {hasMoreTasks && (
            <li className="text-[10px] sm:text-xs text-center text-gray-500 italic pt-1">
              + {tasks.length - maxVisibleTasks} more tasks...
            </li>
          )}
        </ul>
        {/* Arrow pointing to the date */}
        <div 
          className={`absolute w-3 h-3 sm:w-4 sm:h-4 bg-white dark:bg-gray-800 transform rotate-45 
            ${showingBelow ? '-top-1.5 sm:-top-2 left-1/2 -translate-x-1/2' : '-bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2'}`}
        />
      </motion.div>
    );
  }, [hoveredDate, tooltipPosition, getTasksForDate, formatTaskName, formatCategoryName, isMobileRef]);
  
  // Clear the task summary cache when tasks or month changes
  useEffect(() => {
    taskSummaryCacheRef.current.clear();
  }, [tasks, currentMonth]);

  // Return all the JSX and UI implementation
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="monthly-calendar-overlay"
          variants={preferReducedMotion ? reducedMotionVariants : overlayAnimationVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transitionProps}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm"
          style={{ 
            willChange: 'opacity',
            backfaceVisibility: 'hidden'
          }}
        >
          <div 
            className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[92vw] sm:w-full sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto my-auto max-h-[95vh] sm:max-h-[85vh] touch-manipulation"
            ref={calendarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Monthly Calendar"
            onClick={(e) => e.stopPropagation()}
            {...touchHandlerProps}
            onKeyDown={handleContainerKeyDown}
            tabIndex={0}
            style={{
              margin: '0 auto',
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: isMobileRef.current ? 'calc(100% - 16px)' : undefined,
              imageRendering: 'crisp-edges'
            }}
          >
            {/* Calendar header with optimized rendering */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={toggleYearSelector}
                className="flex-1 text-base sm:text-xl font-semibold text-gray-800 dark:text-white mx-1 sm:mx-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md py-1 sm:py-1.5 px-2 sm:px-3 transition-colors"
                aria-label={`Current month and year: ${format(currentMonth, 'MMMM yyyy')}. Click to select year.`}
              >
                {format(currentMonth, isMobileRef.current ? 'MMM yyyy' : 'MMMM yyyy')}
              </button>
              
              <div className="flex-1 flex justify-end">
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Legend - simplified for better performance */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-2 sm:py-3 px-2 sm:px-4 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500"></div>
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500"></div>
                <span>In Progress</span>
              </div>
              {!isMobileRef.current && (
                <div className="hidden sm:flex items-center text-xs gap-1 ml-2 text-gray-500 italic">
                  <span>Swipe or use arrow keys</span>
                </div>
              )}
            </div>

            {/* Year Selector View or Calendar View with optimized rendering */}
            <AnimatePresence mode="wait">
              {viewMode === 'year' ? (
                <motion.div
                  key="year-selector"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.15 }}
                  className="p-3 sm:p-4 pb-4 sm:pb-6 max-h-[250px] overflow-y-auto"
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => handleYearChange(year)}
                        className={`
                          py-1.5 sm:py-2.5 rounded-md text-center transition-colors text-xs sm:text-sm
                          ${year === getYear(currentMonth)
                            ? 'bg-blue-500 text-white font-medium shadow-sm'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                          }
                        `}
                        aria-label={`${year}${year === getYear(currentMonth) ? ', selected' : ''}`}
                        aria-selected={year === getYear(currentMonth)}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="calendar-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="calendar-container w-full"
                  onTouchStart={(e) => {
                    // Only handle touch events at container level if not on a button
                    if (!(e.target as HTMLElement).closest('button')) {
                      handleTouchStart(e);
                    }
                  }}
                  onTouchMove={(e) => {
                    // Allow move events for swipe detection at container level
                    handleTouchMove(e);
                  }}
                  onTouchEnd={(e) => {
                    // Only handle touch events at container level if not on a button
                    if (!(e.target as HTMLElement).closest('button')) {
                      handleTouchEnd(e);
                    }
                  }}
                >
                  {/* Calendar Grid - performance optimized */}
                  <div className="p-2 sm:p-3 md:p-4 pb-4 sm:pb-5 md:pb-6 overflow-x-hidden w-full">
                    {/* Weekday Headers - static render for performance */}
                    <div className="grid grid-cols-7 mb-2 sm:mb-3 md:mb-4 w-full">
                      {WEEKDAYS.map(day => (
                        <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 py-1 sm:py-2">
                          {isMobileRef.current ? day.charAt(0) : day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days - performance optimized grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2.5 content-start w-full">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          // Empty cell for padding - render minimal content
                          return <div key={`empty-${index}`} className="aspect-square"></div>;
                        }
                        
                        // Get task summary using optimized function
                        const summary = getTaskSummary(date);
                        
                        // Safely compare dates to avoid errors - with early calculation
                        let isSelected = false;
                        let isTodayDate = false;
                        
                        try {
                          isSelected = isSameDayOptimized(date, selectedDate);
                          isTodayDate = isToday(date);
                        } catch (error) {
                          // Silent error - performance optimization
                        }
                        
                        const isFocused = focusedDateIndex === index;

                        // Only optimize costly renders with React.memo if we had many calendar days
                        return (
                          <motion.button
                            key={date.toISOString()}
                            ref={el => {
                              dayButtonsRef.current[index] = el;
                            }}
                            onClick={() => handleDateSelection(date)}
                            whileHover={isMobileRef.current ? undefined : "hover"}
                            whileTap="tap"
                            variants={dayCellHoverVariants}
                            initial="initial"
                            style={{ 
                              touchAction: 'manipulation',
                              imageRendering: 'crisp-edges',
                              WebkitFontSmoothing: 'subpixel-antialiased'
                            }}
                            onPointerDown={(e) => {
                              touchStartXRef.current = e.clientX;
                              touchStartYRef.current = e.clientY;
                            }}
                            onPointerUp={(e) => {
                              if (touchStartXRef.current !== null) {
                                const deltaX = e.clientX - touchStartXRef.current;
                                const deltaY = touchStartYRef.current !== null ? e.clientY - touchStartYRef.current : 0;
                                
                                // If movement is minimal, treat as a tap
                                const tapThreshold = 10;
                                if (Math.abs(deltaX) < tapThreshold && Math.abs(deltaY) < tapThreshold) {
                                  handleDateSelection(date);
                                }
                              }
                              
                              touchStartXRef.current = null;
                              touchStartYRef.current = null;
                            }}
                            onMouseEnter={(e) => handleMouseEnter(date, e)}
                            onMouseLeave={handleMouseLeave}
                            tabIndex={isFocused ? 0 : -1}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={`
                              relative aspect-square rounded-md
                              flex flex-col items-center justify-center
                              touch-manipulation border border-transparent
                              min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] md:min-w-[36px] md:min-h-[36px]
                              ${isSelected
                                ? 'bg-blue-500 text-white shadow-md z-10'
                                : isTodayDate
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                : summary.total > 0
                                ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800 shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800'
                              }
                              ${isFocused 
                                ? 'ring-2 ring-blue-400 dark:ring-blue-600 z-10' 
                                : ''
                              }
                              focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600
                              transition-colors
                            `}
                            aria-label={`${format(date, 'MMMM d, yyyy')}${
                              summary.total > 0 ? `, ${summary.total} tasks` : ''
                            }${isSelected ? ', selected' : ''}${isTodayDate ? ', today' : ''}`}
                            aria-selected={isSelected}
                            aria-current={isTodayDate ? "date" : undefined}
                          >
                            {/* Date Number - simplified rendering */}
                            <span className={`
                              text-xs sm:text-sm md:text-base font-medium
                              ${isSelected
                                ? 'text-white'
                                : isTodayDate
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-800 dark:text-gray-200'
                              }
                            `}>
                              {format(date, 'd')}
                            </span>
                            
                            {/* Task count badge - optimized rendering only when needed */}
                            {summary.total > 0 && (
                              <motion.div 
                                className={`absolute ${isSelected 
                                  ? 'top-0 right-0 translate-x-1/3 -translate-y-1/3 bg-white text-blue-500 border-blue-500' 
                                  : '-top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-blue-500 text-white border-white dark:border-gray-800'} 
                                  min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] rounded-full 
                                  text-[8px] sm:text-[10px] font-medium flex items-center justify-center px-1
                                  border shadow-sm`}
                                variants={badgeAnimationVariants}
                                initial="initial"
                                animate="animate"
                                key={`badge-${date.toISOString()}-${summary.total}`}
                                style={{ willChange: 'transform, opacity' }}
                              >
                                {summary.total}
                              </motion.div>
                            )}
                            
                            {/* Status indicator dots - display colored dots for different statuses */}
                            {summary.total > 0 && !isSelected && (
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1 justify-center">
                                {summary.completed > 0 && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
                                )}
                                {summary.overdue > 0 && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
                                )}
                                {summary.inProgress > 0 && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
                                )}
                              </div>
                            )}
                            
                            {/* Selected/Today Indicator Ring - only rendered when needed */}
                            {(isTodayDate && !isSelected) && (
                              <div
                                className="absolute inset-0 rounded-md ring-1 ring-blue-400 dark:ring-blue-500/50"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Footer with controls - simplified rendering */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div>
                {isMobileRef.current ? (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tap to select</p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Swipe or use arrows</p>
                )}
              </div>
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs sm:text-sm font-medium"
                  onClick={handleTodayClick}
                >
                  Today
                </button>
                <button
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs sm:text-sm font-medium"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
            
            {/* Task Tooltip - only render when needed */}
            <AnimatePresence>
              {hoveredDate && renderTooltip}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: MonthlyCalendarProps, nextProps: MonthlyCalendarProps) => {
  // Only re-render if critical props change
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onSelectDate === nextProps.onSelectDate
  );
};

// Export the memoized component with custom comparison to prevent unnecessary re-renders
export const MonthlyCalendar = memo(MonthlyCalendarBase, arePropsEqual);

// Default export for lazy loading
export default { MonthlyCalendar };

