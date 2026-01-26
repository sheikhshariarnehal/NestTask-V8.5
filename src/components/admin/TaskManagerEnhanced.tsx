import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  Plus,
  Filter,
  Search,
  Download,
  Trash2,
  CheckSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { performanceCache, requestDeduplicator } from '../../lib/performanceCache';
import { PerformanceStats } from '../PerformanceStats';
import type { EnhancedTask, TaskFilters, TaskSortOptions } from '../../types/taskEnhanced';
import type { TaskStatus } from '../../types/task';
import { fetchTasksEnhanced, bulkDeleteTasks, bulkUpdateTaskStatus } from '../../services/taskEnhanced.service';
import { TaskEnhancedForm } from './TaskEnhancedForm';
import { TaskEnhancedTable } from './TaskEnhancedTable';
import { TaskDetailsModal } from './TaskDetailsModal';
import { TaskTableSkeleton } from './TaskSkeleton';

interface TaskManagerEnhancedProps {
  userId: string;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isAdmin?: boolean;
  openCreateForm?: boolean;
  onCloseCreateForm?: () => void;
}

const TaskManagerEnhancedComponent = ({
  userId,
  sectionId,
  isSectionAdmin: _isSectionAdmin = false,
  isAdmin: _isAdmin = false,
  openCreateForm = false,
  onCloseCreateForm,
}: TaskManagerEnhancedProps) => {
  // View State
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(openCreateForm);
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);
  const [editingTask, setEditingTask] = useState<EnhancedTask | null>(null);
  const [formKey, setFormKey] = useState(0); // Key to force form remount

  // Sync openCreateForm prop with state
  useEffect(() => {
    if (openCreateForm) {
      setShowCreateForm(true);
    }
  }, [openCreateForm]);

  // Handle closing form
  const handleCloseForm = useCallback(() => {
    setShowCreateForm(false);
    setEditingTask(null);
    if (onCloseCreateForm) {
      onCloseCreateForm();
    }
  }, [onCloseCreateForm]);

  // Data State
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [total, setTotal] = useState(0);

  // Refs for cleanup and optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Filter & Sort State
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    category: 'all',
    status: 'all',
    priority: 'all',
  });
  const [sort, setSort] = useState<TaskSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Bulk Operations
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkOperationLoading, setIsBulkOperationLoading] = useState(false);

  // Performance tracking
  const [loadTime, setLoadTime] = useState<number>();
  const [queryCount, setQueryCount] = useState(1);

  const loadTasks = useCallback(async (refresh = false) => {
    const startTime = performance.now();
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Create cache key for request deduplication
    const cacheKey = `tasks:${userId}:${JSON.stringify({ page, filters, sort, sectionId })}`;

    try {
      if (!refresh) {
        setLoading(true);
      }
      setError(null);

      // When using deduplication, don't pass abort signal to avoid conflicts
      // The deduplicator manages its own request lifecycle
      const response = await requestDeduplicator.deduplicate(cacheKey, () => 
        fetchTasksEnhanced(userId, {
          page,
          pageSize: 25, // Reduced from 50 for better performance
          filters,
          sort,
          sectionId,
          // Don't pass abortSignal through deduplicator to prevent race conditions
          bypassCache: refresh, // Bypass cache on manual refresh
        })
      );

      // Only update state if component is still mounted and request wasn't cancelled
      if (isMountedRef.current && abortController && !abortController.signal.aborted) {
        setTasks(response.tasks);
        setTotal(response.total);
        setError(null);
        
        // Track performance
        const endTime = performance.now();
        setLoadTime(Math.round(endTime - startTime));
        setQueryCount(1); // With indexes, we should only need 1 optimized query
      }
    } catch (err: any) {
      // Only set error if not cancelled and component is mounted
      if (
        isMountedRef.current &&
        abortController && !abortController.signal.aborted &&
        err?.name !== 'AbortError' &&
        err?.message !== 'Operation cancelled'
      ) {
        const errorMessage = err.message || 'Failed to load tasks';
        setError(errorMessage);
        console.error('Error loading tasks:', err);
      }
    } finally {
      if (isMountedRef.current && abortController && !abortController.signal.aborted) {
        setLoading(false);
      }
      // Clear the ref if this was our controller
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [userId, page, filters, sort, sectionId]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Computed values with memoization for performance
  const filteredAndComputedTasks = useMemo(() => {
    let result = tasks;
    
    // Apply client-side filters if needed (for immediate feedback)
    if (filters.search && filters.search.length < 3) {
      // For short search terms, filter client-side for instant feedback
      result = result.filter(task => 
        task.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    return result;
  }, [tasks, filters.search]);

  const taskStats = useMemo(() => {
    const total = filteredAndComputedTasks.length;
    const completed = filteredAndComputedTasks.filter(t => t.status === 'completed').length;
    const overdue = filteredAndComputedTasks.filter(t => 
      new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;
    
    return { total, completed, overdue };
  }, [filteredAndComputedTasks]);

  // Load tasks when filters/sort changes
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      setShowCreateForm(false);
    };
  }, []);

  // Sync openCreateForm prop with local state
  useEffect(() => {
    if (openCreateForm) {
      setFormKey(prev => prev + 1); // Force fresh form
      setShowCreateForm(true);
    }
  }, [openCreateForm]);

  const handleTaskCreated = useCallback((_task: EnhancedTask) => {
    setShowCreateForm(false);
    setFormKey(prev => prev + 1);
    // Reload tasks to get fresh data from server
    loadTasks(true);
  }, [loadTasks]);

  const handleTaskUpdated = useCallback((updatedTask: EnhancedTask) => {
    if (!isMountedRef.current) return;
    
    setTasks(prev => 
      prev.map(t => t.id === updatedTask.id ? updatedTask : t)
    );
    
    setSelectedTask(prev => 
      prev?.id === updatedTask.id ? updatedTask : prev
    );
  }, []);

  const handleTaskEdit = useCallback((task: EnhancedTask) => {
    setEditingTask(task);
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    if (!isMountedRef.current) return;
    
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTotal(prev => prev - 1);
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    setSelectedTask(prev => prev?.id === taskId ? null : prev);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.length === 0 || isBulkOperationLoading) return;
    if (!confirm(`Delete ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''}?`)) return;

    setIsBulkOperationLoading(true);
    try {
      await bulkDeleteTasks(selectedTaskIds);
      
      if (isMountedRef.current) {
        // Optimistically update UI
        setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
        setTotal(prev => prev - selectedTaskIds.length);
        setSelectedTaskIds([]);
        
        // Reload to ensure consistency
        loadTasks(true);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to delete tasks');
        // Reload on error to restore correct state
        loadTasks(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsBulkOperationLoading(false);
      }
    }
  }, [selectedTaskIds, isBulkOperationLoading, loadTasks]);

  const handleBulkStatusUpdate = useCallback(async (status: TaskStatus) => {
    if (selectedTaskIds.length === 0 || isBulkOperationLoading) return;

    setIsBulkOperationLoading(true);
    try {
      await bulkUpdateTaskStatus(selectedTaskIds, status);
      
      if (isMountedRef.current) {
        setSelectedTaskIds([]);
        await loadTasks(true);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to update tasks');
      }
    } finally {
      if (isMountedRef.current) {
        setIsBulkOperationLoading(false);
      }
    }
  }, [selectedTaskIds, isBulkOperationLoading, loadTasks]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Category', 'Status', 'Priority', 'Due Date', 'Created At'];
    const rows = tasks.map(task => [
      task.name,
      task.category,
      task.status,
      task.priority,
      task.dueDate,
      new Date(task.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tasks]);

  // Memoized filter handler
  const handleFilterChange = useCallback((key: keyof TaskFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Memoized sort handler
  const handleSortChange = useCallback((newSort: TaskSortOptions) => {
    setSort(newSort);
  }, []);

  return (
    <>
      {/* Performance Stats (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4">
          <PerformanceStats 
            taskCount={total}
            loadTime={loadTime}
            queryCount={queryCount}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-2">
        <div className="pt-2">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
            {/* Left Section - Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 lg:max-w-3xl">
              {/* Search */}
              <div className="flex-1 sm:max-w-md">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/30 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none shadow-sm"
                    aria-label="Search tasks"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar sm:flex-wrap">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-md font-medium transition-all duration-200 whitespace-nowrap shadow-sm text-sm ${
                    showFilters
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500 shadow-blue-100 dark:shadow-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                  aria-expanded={showFilters}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Filters</span>
                </button>

                {selectedTaskIds.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkStatusUpdate('completed')}
                      disabled={isBulkOperationLoading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed font-medium transition-colors duration-200 whitespace-nowrap shadow-sm text-sm"
                      aria-label={`Mark ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''} as completed`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="text-xs">{isBulkOperationLoading ? 'Processing...' : 'Complete'}</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkOperationLoading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed font-medium transition-colors duration-200 whitespace-nowrap shadow-sm text-sm"
                      aria-label={`Delete ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-xs">{isBulkOperationLoading ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 font-medium transition-all duration-200 whitespace-nowrap shadow-sm text-sm"
                  aria-label="Export tasks to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Export</span>
                </button>
              </div>
            </div>

            {/* Right Section - Create Task Button */}
            <div className="flex items-center justify-end sm:w-auto w-full">
              <button
                onClick={() => {
                  setFormKey(prev => prev + 1);
                  setShowCreateForm(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md font-semibold transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg text-sm"
                aria-label="Create new task"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Create Task</span>
              </button>
            </div>
          </div>
        </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label htmlFor="category-filter" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category-filter"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none text-sm"
                    aria-label="Filter by category"
                  >
                    <option value="all">All Categories</option>
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="presentation">Presentation</option>
                    <option value="project">Project</option>
                    <option value="lab-report">Lab Report</option>
                    <option value="midterm">Midterm</option>
                    <option value="final-exam">Final Exam</option>
                    <option value="task">Task</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status-filter" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none text-sm"
                    aria-label="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="my-tasks">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority-filter" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority-filter"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none text-sm"
                    aria-label="Filter by priority"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setFilters({
                        search: '',
                        category: 'all',
                        status: 'all',
                        priority: 'all',
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors duration-200 text-sm"
                    aria-label="Reset all filters"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Content Area */}
      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 p-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Failed to Load Tasks</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md">{error}</p>
          </div>
          <button
            onClick={() => loadTasks(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors duration-200 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      ) : loading ? (
        <TaskTableSkeleton />
      ) : (
        <TaskEnhancedTable
          tasks={filteredAndComputedTasks}
          selectedTaskIds={selectedTaskIds}
          onSelectTasks={setSelectedTaskIds}
          onTaskClick={setSelectedTask}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDeleted}
          sort={sort}
          onSortChange={handleSortChange}
        />
      )}

      {/* Create Task Modal */}
      {showCreateForm && (
        <TaskEnhancedForm
          key={formKey}
          userId={userId}
          sectionId={sectionId}
          onClose={handleCloseForm}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskEnhancedForm
          userId={userId}
          sectionId={sectionId}
          task={editingTask}
          onClose={handleCloseForm}
          onTaskUpdated={(updatedTask) => {
            handleTaskUpdated(updatedTask);
            setEditingTask(null);
          }}
        />
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          userId={userId}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
    </>
  );
};

export const TaskManagerEnhanced = memo(TaskManagerEnhancedComponent);
