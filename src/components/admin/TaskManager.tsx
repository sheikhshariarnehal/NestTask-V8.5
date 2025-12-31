import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TaskForm } from './task/TaskForm';
import { TaskTable } from './task/TaskTable';
import {
  Plus,
  ChevronUp,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Search,
  X,
  Loader2,
  CheckSquare,
  Trash2,
  RotateCcw,
  List,
  LayoutGrid,
  RefreshCw
} from 'lucide-react';
import type { Task } from '../../types';
import type { NewTask, TaskStatus } from '../../types/task';
import { showErrorToast, showSuccessToast } from '../../utils/notifications';

interface TaskManagerProps {
  tasks: Task[];
  onCreateTask: (task: NewTask, sectionId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  showTaskForm?: boolean;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isLoading?: boolean;
  isCreatingTask?: boolean;
  onTaskCreateStart?: () => void;
  onTaskCreateEnd?: () => void;
  onRefresh?: () => void;
}

// Helper type for consolidated filters
interface TaskFilters {
  category: string;
  status: string;
  search: string;
  startDate: string;
  endDate: string;
}

// Helper type for sort state
interface SortConfig {
  by: 'createdAt' | 'dueDate' | 'name' | 'category' | 'priority';
  order: 'asc' | 'desc';
}

export function TaskManager({
  tasks,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  showTaskForm: initialShowTaskForm = false,
  sectionId,
  isSectionAdmin = false,
  isLoading = false,
  isCreatingTask = false,
  onTaskCreateStart,
  onTaskCreateEnd,
  onRefresh
}: TaskManagerProps) {
  // Main UI state - consolidated for better performance
  const [showTaskForm, setShowTaskForm] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Consolidated filter state
  const [filters, setFilters] = useState<TaskFilters>({
    category: 'all',
    status: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });

  // Consolidated sort state
  const [sort, setSort] = useState<SortConfig>({
    by: 'createdAt',
    order: 'desc'
  });

  // Bulk operations
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Optimized local state management
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [lastTasksUpdate, setLastTasksUpdate] = useState<number>(0);

  // Debounce search input
  const searchTimeoutRef = useRef<number | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Refs for performance optimization
  const isUpdatingRef = useRef<boolean>(false);
  const lastPropsTasksRef = useRef<Task[]>([]);
  
  // Force showTaskForm state to match prop when it changes
  useEffect(() => {
    setShowTaskForm(true);
  }, [initialShowTaskForm]);

  // Optimized task update logic to prevent unnecessary re-renders
  useEffect(() => {
    // Only update if tasks actually changed and we're not in the middle of an update
    if (!isUpdatingRef.current && tasks !== lastPropsTasksRef.current) {
      const now = Date.now();

      // Prevent rapid updates by debouncing
      if (now - lastTasksUpdate > 100) {
        setLocalTasks(tasks);
        setLastTasksUpdate(now);
        lastPropsTasksRef.current = tasks;
      }
    }
  }, [tasks, lastTasksUpdate]);
  
  // Debounced search - optimized
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedSearchTerm(filters.search);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search]);
  
  // Filter tasks with memoization - optimized to use consolidated filters
  const filteredTasks = useMemo(() => {
    return localTasks.filter(task => {
      // Category filter
      if (filters.category !== 'all' && task.category !== filters.category) {
        return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Date range filter
      if (filters.startDate && new Date(task.dueDate) < new Date(filters.startDate)) {
        return false;
      }
      
      if (filters.endDate) {
        const endDateObj = new Date(filters.endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of the day
        if (new Date(task.dueDate) > endDateObj) {
          return false;
        }
      }
      
      // Search filter
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        return (
          task.name.toLowerCase().includes(term) ||
          task.description.toLowerCase().includes(term) ||
          task.category.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [localTasks, filters.category, filters.status, filters.startDate, filters.endDate, debouncedSearchTerm]);
  
  // Sort tasks with memoization - optimized 
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comparison = 0;
      
      switch (sort.by) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'createdAt':
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
          comparison = aTime - bTime;
          break;
        case 'priority':
          const priorityValues = { high: 3, medium: 2, low: 1 };
          const aPriority = a.priority || 'medium';
          const bPriority = b.priority || 'medium';
          comparison = (priorityValues[aPriority as keyof typeof priorityValues] || 0) - 
                       (priorityValues[bPriority as keyof typeof priorityValues] || 0);
          break;
      }
      
      return sort.order === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasks, sort.by, sort.order]);
  
  // Optimized task creation with better state management
  const handleCreateTask = useCallback(async (task: NewTask) => {
    // Prevent multiple simultaneous creations
    if (isUpdatingRef.current) {
      console.log('Task creation already in progress');
      return;
    }

    isUpdatingRef.current = true;

    try {
      // Notify the parent component that task creation is starting
      onTaskCreateStart?.();

      // Clone task to prevent modifying the original
      const taskToProcess = { ...task };

      // If section admin, automatically associate with section
      if (isSectionAdmin && sectionId) {
        const enhancedTask = {
          ...taskToProcess,
          sectionId
        };

        // Submit to the server without optimistic updates to prevent conflicts
        await onCreateTask(enhancedTask, sectionId);
      } else {
        // Standard task creation flow
        await onCreateTask(taskToProcess);
      }

      // Reset filters on successful task creation to show the new task
      setFilters({
        category: 'all',
        status: 'all',
        startDate: '',
        endDate: '',
        search: ''
      });

      showSuccessToast('Task created successfully');

    } catch (error: any) {
      console.error('Error creating task:', error);
      showErrorToast(`Failed to create task: ${error.message || 'Please try again.'}`);
    } finally {
      isUpdatingRef.current = false;
      // Always notify the parent component that task creation has ended
      onTaskCreateEnd?.();
    }
  }, [isSectionAdmin, onCreateTask, sectionId, onTaskCreateStart, onTaskCreateEnd]);
  
  // Optimized task deletion without aggressive optimistic updates
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
      // Make API call first to ensure it succeeds
      await onDeleteTask(taskId);

      // Only update local state after successful API call
      setLocalTasks(prev => prev.filter(t => t.id !== taskId));
      showSuccessToast('Task deleted successfully');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showErrorToast(`Error deleting task: ${error.message || 'Please try again.'}`);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [onDeleteTask]);

  // Optimized task update without aggressive optimistic updates
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
      // Make API call first to ensure it succeeds
      await onUpdateTask(taskId, updates);

      // Only update local state after successful API call
      setLocalTasks(prev =>
        prev.map(t => t.id === taskId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
        )
      );
      showSuccessToast('Task updated successfully');
    } catch (error: any) {
      console.error('Error updating task:', error);
      showErrorToast(`Error updating task: ${error.message || 'Please try again.'}`);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [onUpdateTask]);
  
  // Optimized bulk task deletion with better error handling
  const handleBulkDelete = async () => {
    if (!selectedTaskIds.length || isProcessingBulk) return;

    try {
      setIsProcessingBulk(true);

      // Process deletions sequentially to avoid overwhelming the server
      let successCount = 0;
      const errors: string[] = [];

      for (const taskId of selectedTaskIds) {
        try {
          await onDeleteTask(taskId);
          successCount++;

          // Update local state incrementally for better UX
          setLocalTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error: any) {
          errors.push(`Task ${taskId}: ${error.message}`);
        }
      }

      // Show appropriate success/error messages
      if (successCount > 0) {
        showSuccessToast(`${successCount} tasks deleted successfully`);
      }

      if (errors.length > 0) {
        showErrorToast(`Failed to delete ${errors.length} tasks`);
      }

      setSelectedTaskIds([]);
    } catch (error: any) {
      showErrorToast(`Error deleting tasks: ${error.message || 'Please try again.'}`);
    } finally {
      setIsProcessingBulk(false);
    }
  };
  
  // Optimized bulk task status update with better error handling
  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    if (selectedTaskIds.length === 0 || isProcessingBulk) return;

    setIsProcessingBulk(true);

    try {
      // Process updates sequentially to avoid overwhelming the server
      let successCount = 0;
      const errors: string[] = [];

      for (const taskId of selectedTaskIds) {
        try {
          await onUpdateTask(taskId, {
            status,
            updatedAt: new Date().toISOString()
          });
          successCount++;

          // Update local state incrementally for better UX
          setLocalTasks(prev => prev.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                status,
                updatedAt: new Date().toISOString()
              };
            }
            return task;
          }));
        } catch (error: any) {
          errors.push(`Task ${taskId}: ${error.message}`);
        }
      }

      // Show appropriate success/error messages
      if (successCount > 0) {
        showSuccessToast(`Updated ${successCount} tasks to ${status}`);
      }

      if (errors.length > 0) {
        showErrorToast(`Failed to update ${errors.length} tasks`);
      }

      // Clear selection after the operation is complete
      setSelectedTaskIds([]);
    } catch (error: any) {
      showErrorToast(`Error updating task status: ${error.message || 'Please try again.'}`);
    } finally {
      setIsProcessingBulk(false);
    }
  };
  
  // Toggle task selection - kept simple
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };
  
  // Select all tasks - optimized
  const selectAllTasks = () => {
    setSelectedTaskIds(prev => 
      prev.length === sortedTasks.length ? [] : sortedTasks.map(t => t.id)
    );
  };
  
  // Export tasks to CSV - optimized with better error handling
  const exportToCSV = () => {
    try {
      const headers = ['Name', 'Category', 'Due Date', 'Status', 'Description'];
      
      // Format task data for CSV
      const csvData = sortedTasks.map(task => [
        `"${task.name.replace(/"/g, '""')}"`,
        `"${task.category.replace(/"/g, '""')}"`,
        `"${new Date(task.dueDate).toLocaleDateString()}"`,
        `"${task.status === 'my-tasks' ? 'To Do' : 
            task.status === 'in-progress' ? 'In Progress' : 'Completed'}"`,
        `"${task.description.replace(/"/g, '""')}"`
      ]);
      
      // Add headers
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks_export_${sectionId ? `section_${sectionId}_` : ''}${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up for better memory management
      
      showSuccessToast('Tasks exported successfully');
    } catch (error) {
      showErrorToast('Failed to export tasks. Please try again.');
    }
  };
  
  // Reset all filters - optimized using consolidated filter state
  const resetFilters = () => {
    setFilters({
      category: 'all',
      status: 'all',
      startDate: '',
      endDate: '',
      search: ''
    });
    setDebouncedSearchTerm('');
    setSort({
      by: 'createdAt',
      order: 'desc'
    });
  };

  // Handle sort toggle for column headers
  const handleSort = (field: string) => {
    if (field === 'createdAt' || field === 'dueDate' || field === 'name' || field === 'category' || field === 'priority') {
      setSort(prev => ({
        by: field as SortConfig['by'],
        order: prev.by === field ? (prev.order === 'asc' ? 'desc' : 'asc') : 'asc'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Form Section */}
      {showTaskForm && (
        <div>
          <TaskForm 
            onSubmit={handleCreateTask} 
            sectionId={sectionId}
            isSectionAdmin={isSectionAdmin}
            isSubmitting={isCreatingTask}
          />
        </div>
      )}

      {/* Task Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        {/* Enhanced Control Section - improved responsiveness */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            {/* Left Side Controls - improved mobile layout */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                onClick={() => setShowTaskForm(!showTaskForm)}
                disabled={isLoading}
              >
                {showTaskForm ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden xs:inline">Hide Form</span>
                    <span className="xs:hidden">Hide</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden xs:inline">Create Task</span>
                    <span className="xs:hidden">Create</span>
                  </>
                )}
              </button>
          
              <button
                className={`
                  inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-lg transition-colors duration-200
                  ${isLoading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' 
                    : showFilters
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => setShowFilters(!showFilters)}
                disabled={isLoading}
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Filters</span>
              </button>
          
              {/* View Toggle - more compact on mobile */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-l-lg transition-colors duration-200 ${
                    viewMode === 'table' 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('table')}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-r-lg transition-colors duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
          
              <button
                className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={exportToCSV}
                disabled={isLoading || sortedTasks.length === 0}
                title="Export to CSV"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Export</span>
              </button>

              {onRefresh && (
                <button
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onRefresh}
                  disabled={isLoading}
                  title="Refresh tasks"
                >
                  <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">Refresh</span>
                </button>
              )}
            </div>

            {/* Right Side Search - responsive width */}
            <div className="relative w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
              <div className="flex items-center w-full px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors duration-200">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full ml-2 text-sm bg-transparent border-none outline-none focus:ring-0 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters({...filters, search: ''})}
                    className="p-0.5 sm:p-1 ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters Panel - improved responsiveness */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Tasks
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 px-2"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Reset
              </button>
            </div>
          </div>
          
          {/* Responsive grid for filters */}
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="my-tasks">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              >
                <option value="all">All Categories</option>
                <option value="assignment">Assignment</option>
                <option value="blc">BLC</option>
                <option value="documents">Documents</option>
                <option value="final-exam">Final Exam</option>
                <option value="groups">Groups</option>
                <option value="lab-final">Lab Final</option>
                <option value="lab-performance">Lab Performance</option>
                <option value="lab-report">Lab Report</option>
                <option value="midterm">Midterm</option>
                <option value="presentation">Presentation</option>
                <option value="project">Project</option>
                <option value="quiz">Quiz</option>
                <option value="task">Task</option>
                <option value="others">Others</option>
              </select>
            </div>

            {/* Date Range - spans both columns on mobile */}
            <div className="xs:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
                    placeholder="Start date"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions - responsive layout */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center">
            <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('completed')}
              disabled={isProcessingBulk}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Complete</span>
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('in-progress')}
              disabled={isProcessingBulk}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Progress</span>
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isProcessingBulk}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedTaskIds([])}
              disabled={isProcessingBulk}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Loading state & task table - improved responsiveness */}
      {isLoading ? (
        <div className="p-8 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Task Table with bulk selection and better mobile responsive design */}
          <TaskTable 
            tasks={sortedTasks} 
            onDeleteTask={handleDeleteTask} 
            onUpdateTask={handleUpdateTask}
            isSectionAdmin={isSectionAdmin}
            viewMode={viewMode}
            selectedTaskIds={selectedTaskIds}
            onToggleSelection={toggleTaskSelection}
            onSelectAll={selectAllTasks}
            sortBy={sort.by}
            sortOrder={sort.order}
            onSort={handleSort}
          />
          
          {/* No tasks message */}
          {sortedTasks.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No tasks found. Try adjusting your filters or create a new task.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 