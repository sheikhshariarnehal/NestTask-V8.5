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

  const loadTasks = useCallback(async (refresh = false) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (!refresh) {
        setLoading(true);
      }
      setError(null);

      const response = await fetchTasksEnhanced(userId, {
        page,
        pageSize: 50,
        filters,
        sort,
        sectionId,
        abortSignal: abortController.signal,
      });

      // Only update state if component is still mounted and request wasn't cancelled
      if (isMountedRef.current && !abortController.signal.aborted) {
        setTasks(response.tasks);
        setTotal(response.total);
        setError(null);
      }
    } catch (err: any) {
      // Only set error if not cancelled and component is mounted
      if (
        isMountedRef.current &&
        !abortController.signal.aborted &&
        err?.name !== 'AbortError' &&
        err?.message !== 'Operation cancelled'
      ) {
        const errorMessage = err.message || 'Failed to load tasks';
        setError(errorMessage);
        console.error('Error loading tasks:', err);
      }
    } finally {
      if (isMountedRef.current && !abortController.signal.aborted) {
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

  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(task => 
        task.name.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (filters.category !== 'all') {
      result = result.filter(task => task.category === filters.category);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(task => task.status === filters.status);
    }
    
    // Apply priority filter
    if (filters.priority !== 'all') {
      result = result.filter(task => task.priority === filters.priority);
    }
    
    return result;
  }, [tasks, filters]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Task Management
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span> total tasks
              </p>
              {selectedTaskIds.length > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    {selectedTaskIds.length} selected
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => {
                setFormKey(prev => prev + 1);
                setShowCreateForm(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              aria-label="Create new task"
            >
              <Plus className="w-5 h-5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
            {/* Search */}
            <div className="flex-1 lg:max-w-lg">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search tasks by name or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors shadow-sm focus:shadow-md outline-none"
                  aria-label="Search tasks"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl font-medium transition-all duration-200 touch-manipulation whitespace-nowrap ${
                  showFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
                }`}
                aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                aria-expanded={showFilters}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
              </button>

              {selectedTaskIds.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    disabled={isBulkOperationLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-md hover:shadow-lg touch-manipulation whitespace-nowrap active:scale-95"
                    aria-label={`Mark ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''} as completed`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm">{isBulkOperationLoading ? 'Processing...' : 'Complete'}</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isBulkOperationLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-md hover:shadow-lg touch-manipulation whitespace-nowrap active:scale-95"
                    aria-label={`Delete ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">{isBulkOperationLoading ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </>
              )}

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200 touch-manipulation whitespace-nowrap"
                aria-label="Export tasks to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category-filter"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                  <label htmlFor="status-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
                    aria-label="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="my-tasks">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    id="priority-filter"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition-all duration-200 active:scale-95"
                    aria-label="Reset all filters"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto admin-scrollbar">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Failed to Load Tasks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">{error}</p>
            </div>
            <button
              onClick={() => loadTasks(false)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          <TaskTableSkeleton />
        ) : (
          <TaskEnhancedTable
            tasks={filteredTasks}
            selectedTaskIds={selectedTaskIds}
            onSelectTasks={setSelectedTaskIds}
            onTaskClick={setSelectedTask}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDeleted}
            sort={sort}
            onSortChange={handleSortChange}
          />
        )}
      </div>

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
    </div>
  );
};

export const TaskManagerEnhanced = memo(TaskManagerEnhancedComponent);
