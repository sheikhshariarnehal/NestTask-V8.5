import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  BarChart3,
  LayoutGrid,
  List,
  Filter,
  Search,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckSquare,
  Settings,
  FileText,
} from 'lucide-react';
import type { EnhancedTask, TaskFilters, TaskSortOptions, CreateTaskInput } from '../../types/taskEnhanced';
import type { TaskStatus } from '../../types/task';
import { fetchTasksEnhanced, bulkDeleteTasks, bulkUpdateTaskStatus, bulkUpdateTaskPriority } from '../../services/taskEnhanced.service';
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
}

type ViewMode = 'list' | 'kanban' | 'analytics' | 'templates';

export function TaskManagerEnhanced({
  userId,
  sectionId,
  isSectionAdmin = false,
  isAdmin = false,
}: TaskManagerEnhancedProps) {
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);

  // Data State
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
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

  useEffect(() => {
    loadTasks();
  }, [page, filters, sort, sectionId]);

  const loadTasks = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
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
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTasks(true);
  };

  const handleTaskCreated = (task: EnhancedTask) => {
    setTasks([task, ...tasks]);
    setTotal(total + 1);
    setShowCreateForm(false);
  };

  const handleTaskUpdated = (updatedTask: EnhancedTask) => {
    setTasks(tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setTotal(total - 1);
    setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Delete ${selectedTaskIds.length} selected tasks?`)) return;

    try {
      await bulkDeleteTasks(selectedTaskIds);
      setTasks(tasks.filter(t => !selectedTaskIds.includes(t.id)));
      setTotal(total - selectedTaskIds.length);
      setSelectedTaskIds([]);
      alert('Tasks deleted successfully');
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      alert('Failed to delete tasks');
    }
  };

  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    if (selectedTaskIds.length === 0) return;

    try {
      await bulkUpdateTaskStatus(selectedTaskIds, status);
      await loadTasks(true);
      setSelectedTaskIds([]);
      alert('Tasks updated successfully');
    } catch (error) {
      console.error('Failed to update tasks:', error);
      alert('Failed to update tasks');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Category', 'Status', 'Priority', 'Due Date', 'Assigned To', 'Created At'];
    const rows = tasks.map(task => [
      task.name,
      task.category,
      task.status,
      task.priority,
      task.dueDate,
      task.assignedToUser?.name || 'Unassigned',
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
  };

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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Task Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {total} total tasks
              {selectedTaskIds.length > 0 && ` • ${selectedTaskIds.length} selected`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Refresh"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Task
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'templates'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {(viewMode === 'list' || viewMode === 'kanban') && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {selectedTaskIds.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Mark Completed
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="my-tasks">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <TaskEnhancedTable
                tasks={filteredTasks}
                selectedTaskIds={selectedTaskIds}
                onSelectTasks={setSelectedTaskIds}
                onTaskClick={setSelectedTask}
                onTaskUpdate={handleTaskUpdated}
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
          userId={userId}
          sectionId={sectionId}
          onClose={() => setShowCreateForm(false)}
          onTaskCreated={handleTaskCreated}
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
}
