import { Task } from '../types';
import { isOverdue } from '../utils/dateUtils';
import { useState, useMemo, memo, useCallback } from 'react';
import { TaskDetailsPopup } from './task/TaskDetailsPopup';
import { TaskCard } from './task/TaskCard';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask?: (taskId: string) => void;
  showDeleteButton?: boolean;
}

// Optimized batch size for rendering
const INITIAL_RENDER_COUNT = 20;
const LOAD_MORE_COUNT = 20;

// Apply memo to the main component to prevent unnecessary re-renders
export const TaskList = memo(({ tasks = [], onDeleteTask, showDeleteButton = false }: TaskListProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);

  // Memoized task selection handler
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Load more tasks handler
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, tasks.length));
  }, [tasks.length]);

  // Sort tasks: upcoming first, overdue at bottom, completed last
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
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
  }, [tasks]);

  // Only render visible tasks for performance
  const visibleTasks = useMemo(() => 
    sortedTasks.slice(0, visibleCount),
    [sortedTasks, visibleCount]
  );

  const hasMore = visibleCount < sortedTasks.length;

  // Memoize the empty state to avoid recreation on each render
  const emptyState = useMemo(() => (
    <div className="text-center py-8 sm:py-12 animate-fade-in">
      <img
        src="https://images.unsplash.com/photo-1496115965489-21be7e6e59a0?auto=format&fit=crop&q=80&w=400"
        alt="Empty tasks"
        className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-2xl mx-auto mb-4 opacity-50 shadow-lg"
      />
      <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No tasks found in this category</p>
      <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm sm:text-base">Time to add some new tasks!</p>
    </div>
  ), []);

  if (sortedTasks.length === 0) {
    return emptyState;
  }

  return (
    <div>
      <div className="w-full max-w-7xl mx-auto">
        {/* Mobile-optimized container with improved spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
          gap-2 xs:gap-3 md:gap-4 lg:gap-6
          px-1 xs:px-2 md:px-0
          pb-4 md:pb-0">
          {visibleTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onSelect={handleSelectTask}
            />
          ))}
        </div>
        
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm"
            >
              Load More ({sortedTasks.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Mobile-optimized modal */}
      {selectedTask && (
        <TaskDetailsPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
});