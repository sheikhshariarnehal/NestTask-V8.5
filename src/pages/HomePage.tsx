import React, { useMemo, useState, useEffect } from 'react';
import { ListTodo, CheckCircle2, Clock, AlertCircle, Sparkles, CalendarDays } from 'lucide-react';
import { TaskList } from '../components/TaskList';
import { TaskCategories } from '../components/task/TaskCategories';
import { isOverdue } from '../utils/dateUtils';
import { formatUpcomingDueDate } from '../utils/dateUtils';
import type { Task, TaskCategory } from '../types/task';
import type { User } from '../types/user';

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

export const HomePage: React.FC<HomePageProps> = ({
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

  // Compute task stats
  const taskStats = useMemo(() => {
    // Make sure we have a valid tasks array before calculating
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    const totalTasks = validTasks.length;
    
    // Count all tasks regardless of status or category
    return {
      total: totalTasks,
      inProgress: validTasks.filter(t => t.status === 'in-progress').length,
      completed: validTasks.filter(t => t.status === 'completed').length,
      overdue: validTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length
    };
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

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    
    return validTasks.reduce((acc: Record<string, number>, task) => {
      const category = task.category || 'others';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  // Filter tasks based on selected stat
  const getFilteredTasks = () => {
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
  };

  const getStatTitle = () => {
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
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setStatFilter('all')}
          className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] focus:scale-[1.02] border border-transparent ${
            statFilter === 'all' 
              ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-gray-700 border-blue-200 dark:border-blue-600' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {taskStats.total}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
        </button>

        <button
          onClick={() => setStatFilter('overdue')}
          className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] focus:scale-[1.02] border border-transparent ${
            statFilter === 'overdue' 
              ? 'ring-2 ring-red-500 dark:ring-red-400 bg-red-50 dark:bg-gray-700 border-red-200 dark:border-red-600' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {taskStats.overdue}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Due Tasks</p>
        </button>

        <button
          onClick={() => setStatFilter('in-progress')}
          className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] focus:scale-[1.02] border border-transparent ${
            statFilter === 'in-progress' 
              ? 'ring-2 ring-yellow-500 dark:ring-yellow-400 bg-yellow-50 dark:bg-gray-700 border-yellow-200 dark:border-yellow-600' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {taskStats.inProgress}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
        </button>

        <button
          onClick={() => setStatFilter('completed')}
          className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] focus:scale-[1.02] border border-transparent ${
            statFilter === 'completed' 
              ? 'ring-2 ring-green-500 dark:ring-green-400 bg-green-50 dark:bg-gray-700 border-green-200 dark:border-green-600' 
              : 'bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {taskStats.completed}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
        </button>
      </div>

      {/* Task Categories */}
      <TaskCategories
        onCategorySelect={(category) => {
          setSelectedCategory(category);
          setStatFilter('all');
        }}
        selectedCategory={selectedCategory}
        categoryCounts={categoryCounts}
      />

      {/* Task List */}
      <div>
        {statFilter !== 'all' && (
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {getStatTitle()}
            </h2>
            <button
              onClick={() => setStatFilter('all')}
              className="px-2 py-1 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-md"
            >
              View All Tasks
            </button>
          </div>
        )}
        {getFilteredTasks().length > 0 ? (
          <TaskList
            tasks={getFilteredTasks()}
            showDeleteButton={false}
          />
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <ListTodo className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedCategory || statFilter !== 'all'
                ? "No tasks match your current filters."
                : "You don't have any tasks yet. Get started by adding one!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
