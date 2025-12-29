import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Plus,
  BarChart3,
  LayoutGrid,
  List,
  Filter,
  Search,
  Download,
  Trash2,
  CheckSquare,
  FileText,
} from 'lucide-react';
import type { EnhancedTask, TaskFilters, TaskSortOptions } from '../../types/taskEnhanced';
import type { TaskStatus } from '../../types/task';
import { fetchTasksEnhanced, bulkDeleteTasks, bulkUpdateTaskStatus } from '../../services/taskEnhanced.service';
import { TaskKanbanBoard } from './TaskKanbanBoard';
import { TaskAnalytics } from './TaskAnalytics';
import { TaskTemplateManager } from './TaskTemplateManager';
import { TaskEnhancedForm } from './TaskEnhancedForm';
import { TaskEnhancedTable } from './TaskEnhancedTable';
import { TaskDetailsModal } from './TaskDetailsModal';
import { LoadingSpinner } from '../LoadingSpinner';

interface TaskManagerEnhancedProps {
  userId: string;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isAdmin?: boolean;
  openCreateForm?: boolean;
}

type ViewMode = 'list' | 'kanban' | 'analytics' | 'templates';

const TaskManagerEnhancedComponent = ({
  userId,
  sectionId,
  isSectionAdmin: _isSectionAdmin = false,
  isAdmin: _isAdmin = false,
  openCreateForm = false,
}: TaskManagerEnhancedProps) => {
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(openCreateForm);
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);
  const [editingTask, setEditingTask] = useState<EnhancedTask | null>(null);
  const [formKey, setFormKey] = useState(0); // Key to force form remount

  // Data State
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter & Sort State
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

  const loadTasks = useCallback(async (refresh = false) => {
    try {
      if (!refresh) {
        setLoading(true);
      }

      const response = await fetchTasksEnhanced(userId, {
        page,
        pageSize: 50,
        filters,
        sort,
        sectionId,
      });

      setTasks(response.tasks);
      setTotal(response.total);
    } catch (error) {
      // Silent fail - could add toast notification
    } finally {
      setLoading(false);
    }
  }, [userId, page, filters, sort, sectionId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reset form key when component unmounts or remounts
  useEffect(() => {
    return () => {
      setShowCreateForm(false);
      setFormKey(prev => prev + 1);
    };
  }, []);

  // Sync openCreateForm prop with local state
  useEffect(() => {
    if (openCreateForm) {
      setFormKey(prev => prev + 1); // Force fresh form
      setShowCreateForm(true);
    }
  }, [openCreateForm]);

  const handleTaskCreated = useCallback((task: EnhancedTask) => {
    setTasks(prev => [task, ...prev]);
    setTotal(prev => prev + 1);
    setShowCreateForm(false);
    setFormKey(prev => prev + 1);
    loadTasks(true);
  }, [loadTasks]);

  const handleTaskUpdated = useCallback((updatedTask: EnhancedTask) => {
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(prev => prev?.id === updatedTask.id ? updatedTask : prev);
  }, []);

  const handleTaskEdit = useCallback((task: EnhancedTask) => {
    setEditingTask(task);
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTotal(prev => prev - 1);
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    setSelectedTask(prev => prev?.id === taskId ? null : prev);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Delete ${selectedTaskIds.length} selected tasks?`)) return;

    try {
      await bulkDeleteTasks(selectedTaskIds);
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      setTotal(prev => prev - selectedTaskIds.length);
      setSelectedTaskIds([]);
      alert('Tasks deleted successfully');
    } catch (error) {
      alert('Failed to delete tasks');
    }
  }, [selectedTaskIds]);

  const handleBulkStatusUpdate = useCallback(async (status: TaskStatus) => {
    if (selectedTaskIds.length === 0) return;

    try {
      await bulkUpdateTaskStatus(selectedTaskIds, status);
      await loadTasks(true);
      setSelectedTaskIds([]);
      alert('Tasks updated successfully');
    } catch (error) {
      alert('Failed to update tasks');
    }
  }, [selectedTaskIds, loadTasks]);

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (
          !task.name.toLowerCase().includes(search) &&
          !task.description.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, filters.search]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setFormKey(prev => prev + 1);
                setShowCreateForm(true);
              }}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 flex-1 sm:flex-initial touch-manipulation active:scale-95"
              aria-label="Create new task"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Create Task</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { mode: 'list' as ViewMode, icon: List, label: 'List' },
            { mode: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Kanban' },
            { mode: 'analytics' as ViewMode, icon: BarChart3, label: 'Analytics' },
            { mode: 'templates' as ViewMode, icon: FileText, label: 'Templates' }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap touch-manipulation ${
                viewMode === mode
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-600/50 hover:shadow-md hover:scale-105'
              }`}
              aria-label={`Switch to ${label} view`}
              aria-pressed={viewMode === mode}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      {(viewMode === 'list' || viewMode === 'kanban') && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
            {/* Search */}
            <div className="flex-1 lg:max-w-lg">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search tasks by name or description..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
              </button>

              {selectedTaskIds.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-all duration-200 shadow-md hover:shadow-lg touch-manipulation whitespace-nowrap active:scale-95"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm">Complete</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-all duration-200 shadow-md hover:shadow-lg touch-manipulation whitespace-nowrap active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </>
              )}

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200 touch-manipulation whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="my-tasks">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none"
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
                    onClick={() =>
                      setFilters({
                        search: '',
                        category: 'all',
                        status: 'all',
                        priority: 'all',
                      })
                    }
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition-all duration-200 active:scale-95"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto admin-scrollbar">\n        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <LoadingSpinner />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <TaskEnhancedTable
                tasks={filteredTasks}
                selectedTaskIds={selectedTaskIds}
                onSelectTasks={setSelectedTaskIds}
                onTaskClick={setSelectedTask}
                onTaskEdit={handleTaskEdit}
                onTaskDelete={handleTaskDeleted}
                sort={sort}
                onSortChange={setSort}
              />
            )}

            {viewMode === 'kanban' && (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskUpdate={handleTaskUpdated}
                onTaskClick={setSelectedTask}
              />
            )}

            {viewMode === 'analytics' && <TaskAnalytics sectionId={sectionId} />}

            {viewMode === 'templates' && (
              <TaskTemplateManager
                userId={userId}
                sectionId={sectionId}
                onCreateFromTemplate={() => setShowCreateForm(true)}
              />
            )}
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateForm && (
        <TaskEnhancedForm
          key={formKey}
          userId={userId}
          sectionId={sectionId}
          onClose={() => setShowCreateForm(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskEnhancedForm
          userId={userId}
          sectionId={sectionId}
          task={editingTask}
          onClose={() => setEditingTask(null)}
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

      {/* Mobile FAB - Create Task */}
      <button
        onClick={() => {
          setFormKey(prev => prev + 1);
          setShowCreateForm(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center z-50 active:scale-90 hover:scale-110"
        aria-label="Create Task"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};

export const TaskManagerEnhanced = memo(TaskManagerEnhancedComponent);
