import React, { useMemo, useState, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { ListTodo, CheckCircle2, Clock, AlertCircle, Sparkles, CalendarDays } from 'lucide-react';
import { TaskList } from '../components/TaskList';
import { isOverdue } from '../utils/dateUtils';
import { formatUpcomingDueDate } from '../utils/dateUtils';
import type { Task, TaskCategory } from '../types/task';
import type { User } from '../types/user';

// Lazy load TaskCategories for better initial load performance
const TaskCategories = lazy(() => import('../components/task/TaskCategories').then(m => ({ default: m.TaskCategories })));

type StatFilter = 'all' | 'overdue' | 'in-progress' | 'completed';

interface HomePageProps {
  user: User;
  tasks: Task[];
  selectedCategory: TaskCategory | null;
  setSelectedCategory: (category: TaskCategory | null) => void;
  statFilter: StatFilter;
  setStatFilter: (filter: StatFilter) => void;
}

// Enhanced type for upcoming tasks to include pre-formatted due date
interface UpcomingTaskDisplayData extends Task {
  formattedDueDate: string;
}

export const HomePage: React.FC<HomePageProps> = memo(({
  user,
  tasks,
  selectedCategory,
  setSelectedCategory,
  statFilter,
  setStatFilter
}) => {
  const [currentRecentTaskIndex, setCurrentRecentTaskIndex] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);
  const MAX_RECENT_TASKS_TO_SHOW = 3;

  useEffect(() => {
    const greetingTimer = setTimeout(() => {
      setShowGreeting(false);
    }, 1500);

    return () => {
      clearTimeout(greetingTimer);
    };
  }, []);

  // Compute task stats - optimized to do single pass through tasks
  const taskStats = useMemo(() => {
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    
    // Single pass through tasks for better performance
    return validTasks.reduce((stats, task) => {
      stats.total++;
      if (task.status === 'in-progress') stats.inProgress++;
      if (task.status === 'completed') stats.completed++;
      if (isOverdue(task.dueDate) && task.status !== 'completed') stats.overdue++;
      return stats;
    }, { total: 0, inProgress: 0, completed: 0, overdue: 0 });
  }, [tasks]);

  // Pre-calculate upcoming tasks with their formatted due dates
  const upcomingTasksData: UpcomingTaskDisplayData[] = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return tasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, MAX_RECENT_TASKS_TO_SHOW)
      .map(task => ({
        ...task,
        formattedDueDate: formatUpcomingDueDate(task.dueDate)
      }));
  }, [tasks]);

  useEffect(() => {
    if (upcomingTasksData.length <= 1) {
      setCurrentRecentTaskIndex(0); // Reset if tasks change and only 0 or 1 is available
      return;
    }

    const timer = setInterval(() => {
      setCurrentRecentTaskIndex(prevIndex => (prevIndex + 1) % upcomingTasksData.length);
    }, 5000); // Cycle every 5 seconds

    return () => clearInterval(timer);
  }, [upcomingTasksData.length]);

  // Compute category counts - optimized
  const categoryCounts = useMemo(() => {
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    
    return validTasks.reduce((acc: Record<string, number>, task) => {
      const category = task.category || 'others';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  // Filter tasks based on selected stat - memoized for performance
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // First apply category filter if selected
    if (selectedCategory) {
      filtered = filtered.filter(task => task.category === selectedCategory);
    }

    // Then apply stat filter
    switch (statFilter) {
      case 'overdue':
        return filtered.filter(task => isOverdue(task.dueDate) && task.status !== 'completed');
      case 'in-progress':
        return filtered.filter(task => task.status === 'in-progress');
      case 'completed':
        return filtered.filter(task => task.status === 'completed');
      default:
        return filtered;
    }
  }, [tasks, selectedCategory, statFilter]);

  // Memoize stat title to avoid recalculation
  const statTitle = useMemo(() => {
    switch (statFilter) {
      case 'overdue':
        return 'Due Tasks';
      case 'in-progress':
        return 'In Progress Tasks';
      case 'completed':
        return 'Completed Tasks';
      default:
        return selectedCategory 
          ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace('-', ' ')} Tasks`
          : 'All Tasks';
    }
  }, [statFilter, selectedCategory]);

  // Memoized event handlers for stat filter buttons
  const handleAllFilter = useCallback(() => setStatFilter('all'), [setStatFilter]);
  const handleOverdueFilter = useCallback(() => setStatFilter('overdue'), [setStatFilter]);
  const handleInProgressFilter = useCallback(() => setStatFilter('in-progress'), [setStatFilter]);
  const handleCompletedFilter = useCallback(() => setStatFilter('completed'), [setStatFilter]);
  
  // Memoized handler for category selection
  const handleCategorySelect = useCallback((category: TaskCategory | null) => {
    setSelectedCategory(category);
    setStatFilter('all');
  }, [setSelectedCategory, setStatFilter]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8 lg:pb-10">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white overflow-hidden">
        <div
          className={`transition-all duration-1000 ease-in-out ${
            showGreeting ? 'opacity-100 max-h-[6rem]' : 'opacity-0 max-h-0'
          }`}
          style={{ overflow: 'hidden' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 flex-shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {user?.name || 'User'}!
            </h1>
          </div>
          <p className="text-blue-100 pl-10 sm:pl-11">
            You have {taskStats.total} total tasks.
          </p>
        </div>

        {/* Upcoming Task Display Area - remains in flow, pulled up by collapsing div above */}
        <div className={`pl-10 sm:pl-11 min-h-[3.5em] relative transition-all duration-1000 ease-in-out ${showGreeting ? 'mt-3' : 'mt-0'}`}> 
          {upcomingTasksData.length > 0 ? (
            upcomingTasksData.map((task, index) => (
              <div
                key={task.id}
                className={`absolute w-full transition-opacity duration-700 ease-in-out flex flex-col gap-1 ${ /* Slightly increased gap */
                  index === currentRecentTaskIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <p className="text-base font-medium text-blue-50 truncate" title={task.name}> {/* Slightly larger task name */}
                  {task.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" /> {/* Slightly larger icon */}
                  <p className="text-xs text-blue-200 font-light"> {/* Lighter font for due date text */}
                    {task.formattedDueDate} {/* Use pre-calculated value */}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-blue-100 opacity-75">
              {showGreeting ? "No upcoming tasks right now." : "You're all caught up!"}
            </p>
          )}
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <button
          onClick={handleAllFilter}
          className={`rounded-lg p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] border border-transparent ${
            statFilter === 'all' 
              ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600 border-blue-300 dark:border-blue-500 shadow-lg' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm">
              <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {taskStats.total}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
        </button>

        <button
          onClick={handleOverdueFilter}
          className={`rounded-lg p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] border border-transparent ${
            statFilter === 'overdue' 
              ? 'ring-2 ring-red-500 dark:ring-red-400 bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-700 dark:to-gray-600 border-red-300 dark:border-red-500 shadow-lg' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {taskStats.overdue}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Due Tasks</p>
        </button>

        <button
          onClick={handleInProgressFilter}
          className={`rounded-lg p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] border border-transparent ${
            statFilter === 'in-progress' 
              ? 'ring-2 ring-yellow-500 dark:ring-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-gray-700 dark:to-gray-600 border-yellow-300 dark:border-yellow-500 shadow-lg' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {taskStats.inProgress}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">In Progress</p>
        </button>

        <button
          onClick={handleCompletedFilter}
          className={`rounded-lg p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98] border border-transparent ${
            statFilter === 'completed' 
              ? 'ring-2 ring-green-500 dark:ring-green-400 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-700 dark:to-gray-600 border-green-300 dark:border-green-500 shadow-lg' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {taskStats.completed}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Completed</p>
        </button>
      </div>

      {/* Task Categories */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
        <TaskCategories
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
        />
      </Suspense>

      {/* Task List */}
      <div className="pb-4 sm:pb-6">
        {statFilter !== 'all' && (
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {statTitle}
            </h2>
            <button
              onClick={handleAllFilter}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              View All Tasks
            </button>
          </div>
        )}
        {filteredTasks.length > 0 ? (
          <TaskList
            tasks={filteredTasks}
            showDeleteButton={false}
          />
        ) : (
          <div className="text-center py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <ListTodo className="mx-auto h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 sm:mt-4 text-sm sm:text-base font-medium text-gray-900 dark:text-white">No tasks</h3>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto px-4">
              {selectedCategory || statFilter !== 'all'
                ? "No tasks match your current filters."
                : "You don't have any tasks yet. Get started by adding one!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
