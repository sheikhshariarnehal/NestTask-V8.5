import React, { useMemo, useCallback, memo, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ListTodo, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TaskList } from '../components/TaskList';
import { isOverdue } from '../utils/dateUtils';
import type { Task, TaskCategory } from '../types/task';
import type { User } from '../types/user';

// Lazy load TaskCategories for better initial load performance
const TaskCategories = lazy(() => import('../components/task/TaskCategories').then(m => ({ default: m.TaskCategories })));

type StatFilter = 'all' | 'overdue' | 'in-progress' | 'completed';

interface HomePageProps {
  user: User;
  tasks: Task[];
  tasksLoading: boolean;
  hasCompletedInitialTasksLoad: boolean;
  selectedCategory: TaskCategory | null;
  setSelectedCategory: (category: TaskCategory | null) => void;
  statFilter: StatFilter;
  setStatFilter: (filter: StatFilter) => void;
}

// Stat card configuration for cleaner rendering
const STAT_CONFIG = {
  all: {
    icon: ListTodo,
    label: 'Total Tasks',
    activeClasses: 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  overdue: {
    icon: AlertCircle,
    label: 'Due Tasks',
    activeClasses: 'ring-2 ring-red-500 dark:ring-red-400 bg-red-50 dark:bg-gray-700 border-red-200 dark:border-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  'in-progress': {
    icon: Clock,
    label: 'In Progress',
    activeClasses: 'ring-2 ring-amber-500 dark:ring-amber-400 bg-amber-50 dark:bg-gray-700 border-amber-200 dark:border-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    activeClasses: 'ring-2 ring-green-500 dark:ring-green-400 bg-green-50 dark:bg-gray-700 border-green-200 dark:border-green-600',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400'
  }
} as const;

// Memoized stat card component
const StatCard = memo(({ 
  type, 
  count, 
  isActive, 
  onClick 
}: { 
  type: keyof typeof STAT_CONFIG; 
  count: number; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  const config = STAT_CONFIG[type];
  const Icon = config.icon;
  
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl p-4 sm:p-5 transition-all duration-200 border-2 min-h-stat-card flex items-center ${
        isActive 
          ? config.activeClasses
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:scale-105'
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        <div className={`p-2.5 rounded-lg ${config.iconBg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${config.iconColor}`} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
            {count}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {config.label}
          </div>
        </div>
      </div>
    </button>
  );
});

export const HomePage: React.FC<HomePageProps> = memo(({
  user,
  tasks,
  tasksLoading,
  hasCompletedInitialTasksLoad,
  selectedCategory,
  setSelectedCategory,
  statFilter,
  setStatFilter
}) => {
  // Keep the task skeleton perceptible even on fast connections.
  const [showTaskSkeleton, setShowTaskSkeleton] = useState(() => tasksLoading || !hasCompletedInitialTasksLoad);
  const skeletonStartRef = useRef<number | null>(null);
  const maxLoadTimeoutRef = useRef<number | undefined>(undefined);

  const MIN_SKELETON_MS = 500;
  const MAX_LOADING_TIME = 30000; // 30 seconds maximum loading time

  useEffect(() => {
    let hideTimer: number | undefined;

    const consideredLoading = tasksLoading || !hasCompletedInitialTasksLoad;

    if (consideredLoading) {
      if (skeletonStartRef.current == null) {
        skeletonStartRef.current = Date.now();
        
        // Set a maximum timeout to force hide skeleton if loading takes too long
        maxLoadTimeoutRef.current = window.setTimeout(() => {
          console.warn('[HomePage] Maximum loading time exceeded, forcing skeleton hide');
          setShowTaskSkeleton(false);
          skeletonStartRef.current = null;
        }, MAX_LOADING_TIME);
      }
      setShowTaskSkeleton(true);
      return () => {
        if (hideTimer) window.clearTimeout(hideTimer);
      };
    }

    if (!tasksLoading && showTaskSkeleton) {
      // Clear the maximum timeout since loading completed
      if (maxLoadTimeoutRef.current) {
        window.clearTimeout(maxLoadTimeoutRef.current);
        maxLoadTimeoutRef.current = undefined;
      }
      
      const startedAt = skeletonStartRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(MIN_SKELETON_MS - elapsed, 0);

      hideTimer = window.setTimeout(() => {
        setShowTaskSkeleton(false);
        skeletonStartRef.current = null;
      }, remaining);
    } else {
      skeletonStartRef.current = null;
    }

    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      if (maxLoadTimeoutRef.current) {
        window.clearTimeout(maxLoadTimeoutRef.current);
        maxLoadTimeoutRef.current = undefined;
      }
    };
  }, [tasksLoading, hasCompletedInitialTasksLoad, showTaskSkeleton]);

  // Compute all task stats and category counts in a single pass for better performance
  const { taskStats, categoryCounts } = useMemo(() => {
    if (!tasks?.length) {
      return {
        taskStats: { total: 0, inProgress: 0, completed: 0, overdue: 0 },
        categoryCounts: {}
      };
    }
    
    const stats = { total: 0, inProgress: 0, completed: 0, overdue: 0 };
    const counts: Record<string, number> = {};
    
    tasks.forEach(task => {
      stats.total++;
      if (task.status === 'in-progress') stats.inProgress++;
      else if (task.status === 'completed') stats.completed++;
      if (task.status !== 'completed' && isOverdue(task.dueDate)) stats.overdue++;
      
      const category = task.category || 'others';
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return { taskStats: stats, categoryCounts: counts };
  }, [tasks]);

  // Filter and sort tasks based on category and stat filter
  const filteredTasks = useMemo(() => {
    if (!tasks?.length) return [];
    
    let filtered = selectedCategory 
      ? tasks.filter(task => task.category === selectedCategory)
      : tasks;

    switch (statFilter) {
      case 'overdue':
        filtered = filtered.filter(task => task.status !== 'completed' && isOverdue(task.dueDate));
        break;
      case 'in-progress':
        filtered = filtered.filter(task => task.status === 'in-progress');
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === 'completed');
        break;
    }
    
    // Sort tasks: upcoming first, overdue at bottom, completed last
    return [...filtered].sort((a, b) => {
      const aIsOverdue = a.status !== 'completed' && isOverdue(a.dueDate);
      const bIsOverdue = b.status !== 'completed' && isOverdue(b.dueDate);
      
      // Completed tasks go to the very bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      // Overdue tasks go to bottom (before completed)
      if (aIsOverdue && !bIsOverdue) return 1;
      if (!aIsOverdue && bIsOverdue) return -1;

      // For tasks in the same category, sort by due date (earliest first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, selectedCategory, statFilter]);

  // Get display title
  const displayTitle = useMemo(() => {
    if (statFilter !== 'all') return STAT_CONFIG[statFilter].label;
    if (selectedCategory) {
      return `${selectedCategory.charAt(0).toUpperCase()}${selectedCategory.slice(1).replace('-', ' ')} Tasks`;
    }
    return 'All Tasks';
  }, [statFilter, selectedCategory]);

  // Handlers
  const handleFilterChange = useCallback((filter: StatFilter) => () => setStatFilter(filter), [setStatFilter]);
  
  const handleCategorySelect = useCallback((category: TaskCategory | null) => {
    setSelectedCategory(category);
    setStatFilter('all');
  }, [setSelectedCategory, setStatFilter]);

  const handleClearFilter = useCallback(() => setStatFilter('all'), [setStatFilter]);

  return (
    <div className="space-y-5 pb-6 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg animate-slideUp">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-blue-100 text-sm sm:text-base">
          {taskStats.total === 0 
            ? "You're all caught up! No tasks yet."
            : taskStats.overdue > 0 
              ? `You have ${taskStats.overdue} task${taskStats.overdue > 1 ? 's' : ''} due`
              : `You have ${taskStats.total} task${taskStats.total > 1 ? 's' : ''} to manage`
          }
        </p>
      </div>

      {/* Task Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="animate-scaleIn stagger-1">
          <StatCard
            type="all"
            count={taskStats.total}
            isActive={statFilter === 'all'}
            onClick={handleFilterChange('all')}
          />
        </div>
        <div className="animate-scaleIn stagger-2">
          <StatCard
            type="overdue"
            count={taskStats.overdue}
            isActive={statFilter === 'overdue'}
            onClick={handleFilterChange('overdue')}
          />
        </div>
        <div className="animate-scaleIn stagger-3">
          <StatCard
            type="in-progress"
            count={taskStats.inProgress}
            isActive={statFilter === 'in-progress'}
            onClick={handleFilterChange('in-progress')}
          />
        </div>
        <div className="animate-scaleIn stagger-4">
          <StatCard
            type="completed"
            count={taskStats.completed}
            isActive={statFilter === 'completed'}
            onClick={handleFilterChange('completed')}
          />
        </div>
      </div>

      {/* Task Categories */}
      <Suspense fallback={
        <div className="space-y-3 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div 
                key={i} 
                className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 min-h-category-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }>
        <TaskCategories
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
        />
      </Suspense>

      {/* Task List Section */}
      <div>
        {statFilter !== 'all' && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {displayTitle}
            </h2>
            <button
              onClick={handleClearFilter}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View All
            </button>
          </div>
        )}
        
        {showTaskSkeleton ? (
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
                    <div className="space-y-2">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
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
        ) : filteredTasks.length > 0 ? (
          <TaskList tasks={filteredTasks} showDeleteButton={false} />
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <ListTodo className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No tasks</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedCategory || statFilter !== 'all'
                ? "No tasks match your filters"
                : "Get started by adding a task"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
