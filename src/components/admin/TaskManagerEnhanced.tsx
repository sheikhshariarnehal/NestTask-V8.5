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
    <>
      {/* Toolbar */}
      <div className="mb-6">
        <div className="pt-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Left Section - Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-3xl">
              {/* Search */}
              <div className="flex-1 sm:max-w-md">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/30 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all outline-none shadow-sm"
                    aria-label="Search tasks"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar sm:flex-wrap">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-all duration-200 whitespace-nowrap shadow-sm ${
                    showFilters
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500 shadow-blue-100 dark:shadow-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                  aria-expanded={showFilters}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </button>

                {selectedTaskIds.length > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkStatusUpdate('completed')}
                      disabled={isBulkOperationLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed font-medium transition-colors duration-200 whitespace-nowrap shadow-sm"
                      aria-label={`Mark ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''} as completed`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm">{isBulkOperationLoading ? 'Processing...' : 'Complete'}</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkOperationLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed font-medium transition-colors duration-200 whitespace-nowrap shadow-sm"
                      aria-label={`Delete ${selectedTaskIds.length} selected task${selectedTaskIds.length > 1 ? 's' : ''}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">{isBulkOperationLoading ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 font-medium transition-all duration-200 whitespace-nowrap shadow-sm"
                  aria-label="Export tasks to CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export</span>
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg"
                aria-label="Create new task"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm">Create Task</span>
              </button>
            </div>
          </div>
        </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category-filter"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors duration-200"
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
      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
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
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
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
