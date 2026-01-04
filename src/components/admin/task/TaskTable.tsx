import { useState, useEffect, useRef } from 'react';
import { Search, Trash2, CheckCircle, Clock, ListTodo, Edit2, X, ChevronLeft, ChevronRight, Building, AlertTriangle, SortAsc, SortDesc, MoreHorizontal, CheckSquare, Square, Copy, CheckCheck } from 'lucide-react';
import { TaskEditModal } from './TaskEditModal';
import { formatDate, isOverdue } from '../../../utils/dateUtils';
import type { Task } from '../../../types';
import type { TaskPriority } from '../../../types/task';

interface TaskTableProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, task: Partial<Task>) => void;
  isSectionAdmin?: boolean;
  viewMode?: 'table' | 'grid';
  selectedTaskIds?: string[];
  onToggleSelection?: (taskId: string) => void;
  onSelectAll?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function TaskTable({ 
  tasks, 
  onDeleteTask, 
  onUpdateTask, 
  isSectionAdmin = false,
  viewMode = 'table',
  selectedTaskIds = [],
  onToggleSelection = () => {},
  onSelectAll = () => {},
  sortBy = 'dueDate',
  sortOrder = 'asc',
  onSort = () => {}
}: TaskTableProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [activeTouchId, setActiveTouchId] = useState<string | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Check viewport width on mount and window resize
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkViewport();
    
    // Add event listener
    window.addEventListener('resize', checkViewport);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkViewport);
  }, []);
  
  // Truncate long text for cards
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'in-progress':
        return <Clock className="w-3 h-3" />;
      default:
        return <ListTodo className="w-3 h-3" />;
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'To Do';
    }
  };
  
  // Get priority color and badge
  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Low</span>;
      default:
        return null;
    }
  };
  
  // Handle task deletion
  const handleDeleteTask = async () => {
    if (taskToDelete) {
      try {
        await onDeleteTask(taskToDelete);
        setTaskToDelete(null);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };
  
  // Handle task update
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await onUpdateTask(taskId, updates);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  // Render sort indicator for column headers
  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    
    return sortOrder === 'asc' ? 
      <SortAsc className="w-3.5 h-3.5 ml-1 inline-block" /> : 
      <SortDesc className="w-3.5 h-3.5 ml-1 inline-block" />;
  };
  
  // Handle long press on mobile for task cards
  const handleTouchStart = (taskId: string) => (e: React.TouchEvent) => {
    // Only handle primary touch
    if (e.touches.length !== 1 || activeTouchId) return;
    
    // Set a timer for long press
    const timer = window.setTimeout(() => {
      // On long press, select the task
      onToggleSelection(taskId);
      
      // Provide haptic feedback on mobile if available
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // Ignore if vibration API not available
        }
      }
    }, 500);
    
    setLongPressTimer(timer);
    setActiveTouchId(taskId);
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setActiveTouchId(null);
  };

  const handleTouchMove = () => {
    // If user moves their finger, cancel the long press
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  
  // Function to copy task details
  const handleCopyTask = async (task: Task) => {
    // Filter out the attachments section from description
    const cleanDescription = task.description.replace(/\*\*Attachments:\*\*[\s\S]*?(?=\n\n|$)/g, '').trim();

    const taskDetails = `
📋 TASK: ${task.name}
📅 Due Date: ${formatDate(task.dueDate)}
🏷️ Category: ${task.category}

📝 Description:
${cleanDescription}

🌐 View: https://nesttask.vercel.app/
    `.trim();

    try {
      await navigator.clipboard.writeText(taskDetails);
      setCopiedTaskId(task.id);
      setTimeout(() => setCopiedTaskId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy task details:', err);
    }
  };
  
  // If no tasks are available, show a message
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No tasks available</p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'table' ? (
        <div className="relative overflow-hidden rounded-lg">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {/* Checkbox column - always visible */}
                    <th className="w-12 sm:w-8 px-2 sm:px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={onSelectAll}
                          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                          aria-label="Select all tasks"
                        >
                          {selectedTaskIds.length > 0 && selectedTaskIds.length === tasks.length ? (
                            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </div>
                    </th>
                    
                    {/* Task name column - always visible */}
                    <th className="px-2 sm:px-4 py-3 text-left">
                      <button 
                        onClick={() => onSort('name')}
                        className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <span className="hidden sm:inline">Task </span>Name
                        {renderSortIndicator('name')}
                      </button>
                    </th>
                    
                    {/* Category column - hidden on mobile */}
                    <th className="hidden sm:table-cell px-4 py-3 text-left">
                      <button 
                        onClick={() => onSort('category')}
                        className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Category
                        {renderSortIndicator('category')}
                      </button>
                    </th>
                    
                    {/* Due date column - condensed on mobile */}
                    <th className="px-2 sm:px-4 py-3 text-left">
                      <button 
                        onClick={() => onSort('dueDate')}
                        className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <span className="hidden sm:inline">Due </span>Date
                        {renderSortIndicator('dueDate')}
                      </button>
                    </th>
                    
                    {/* Status column - condensed on mobile */}
                    <th className="px-2 sm:px-4 py-3 text-left">
                      <button
                        onClick={() => onSort('status')}
                        className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Status
                        {renderSortIndicator('status')}
                      </button>
                    </th>
                    
                    {/* Actions column - always visible */}
                    <th className="px-2 sm:px-4 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.map((task) => (
                    <tr 
                      key={task.id}
                      className={`group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        selectedTaskIds.includes(task.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="w-12 sm:w-8 px-2 sm:px-4 py-2">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={() => onToggleSelection(task.id)}
                            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            {selectedTaskIds.includes(task.id) ? (
                              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      
                      {/* Task name cell */}
                      <td className="px-2 sm:px-4 py-2">
                        <div className="max-w-xs sm:max-w-sm">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {task.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 sm:hidden">
                            {task.category.replace(/-/g, ' ')}
                          </div>
                        </div>
                      </td>
                      
                      {/* Category cell - hidden on mobile */}
                      <td className="hidden sm:table-cell px-4 py-2">
                        <div className="text-sm capitalize text-gray-900 dark:text-white">
                          {task.category.replace(/-/g, ' ')}
                        </div>
                        {task.priority && (
                          <div className="mt-1">{getPriorityBadge(task.priority)}</div>
                        )}
                      </td>
                      
                      {/* Due date cell */}
                      <td className="px-2 sm:px-4 py-2">
                        <span className={`text-xs sm:text-sm flex items-center gap-1 ${
                          isOverdue(task.dueDate, task.status) 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          )}
                          <span className="whitespace-nowrap">{formatDate(task.dueDate)}</span>
                        </span>
                      </td>
                      
                      {/* Status cell */}
                      <td className="px-2 sm:px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span className="hidden xs:inline">{getStatusLabel(task.status)}</span>
                        </span>
                      </td>
                      
                      {/* Actions cell */}
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {/* Copy button */}
                          <button
                            onClick={() => handleCopyTask(task)}
                            className={`p-1 sm:p-1.5 rounded-lg transition-colors duration-200 ${
                              copiedTaskId === task.id
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'hover:bg-gray-100 text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                            title="Copy task details"
                          >
                            {copiedTaskId === task.id ? (
                              <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1 sm:p-1.5 rounded-lg transition-colors duration-200 hover:bg-blue-100 text-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          {/* Complete/Incomplete button */}
                          <button
                            onClick={() => onUpdateTask(task.id, { 
                              status: task.status === 'completed' ? 'my-tasks' : 'completed'
                            })}
                            className={`p-1 sm:p-1.5 rounded-lg transition-colors duration-200 ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'hover:bg-gray-100 text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                            title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 sm:p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors duration-200"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {tasks.map((task) => (
            <div 
              key={task.id}
              className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all ${
                selectedTaskIds.includes(task.id) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              }`}
            >
              {/* Task content */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {task.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {task.description}
                  </p>
                </div>
              </div>

              {/* Task metadata */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {task.category}
                </span>
                <span className={`px-2 py-1 rounded-md ${
                  isOverdue(task.dueDate) && task.status !== 'completed'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {formatDate(task.dueDate)}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2">
                {/* Copy button */}
                <button
                  onClick={() => handleCopyTask(task)}
                  className={`p-1 sm:p-1.5 rounded-lg transition-colors duration-200 ${
                    copiedTaskId === task.id
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'hover:bg-gray-100 text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  title="Copy task details"
                >
                  {copiedTaskId === task.id ? (
                    <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>

                {/* Edit button */}
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-1 sm:p-1.5 rounded-lg transition-colors duration-200 hover:bg-blue-100 text-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  title="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Complete/Incomplete button */}
                <button
                  onClick={() => onUpdateTask(task.id, { 
                    status: task.status === 'completed' ? 'my-tasks' : 'completed'
                  })}
                  className={`p-1 sm:p-1.5 rounded-lg transition-colors duration-200 ${
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'hover:bg-gray-100 text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                
                {/* Delete button */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1 sm:p-1.5 hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors duration-200"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
          isSectionAdmin={isSectionAdmin}
        />
      )}
    </>
  );
}