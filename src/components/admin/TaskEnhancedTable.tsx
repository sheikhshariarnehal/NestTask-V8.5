import React from 'react';
import { ChevronUp, ChevronDown, Trash2, Eye, Calendar, Edit2, FileText } from 'lucide-react';
import type { EnhancedTask, TaskSortOptions } from '../../types/taskEnhanced';
import { deleteTaskEnhanced } from '../../services/taskEnhanced.service';

interface TaskEnhancedTableProps {
  tasks: EnhancedTask[];
  selectedTaskIds: string[];
  onSelectTasks: (ids: string[]) => void;
  onTaskClick: (task: EnhancedTask) => void;
  onTaskEdit: (task: EnhancedTask) => void;
  onTaskDelete: (taskId: string) => void;
  sort: TaskSortOptions;
  onSortChange: (sort: TaskSortOptions) => void;
}

export const TaskEnhancedTable = React.memo(function TaskEnhancedTable({
  tasks,
  selectedTaskIds,
  onSelectTasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  sort,
  onSortChange,
}: TaskEnhancedTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectTasks(tasks.map(t => t.id));
    } else {
      onSelectTasks([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      onSelectTasks([...selectedTaskIds, taskId]);
    } else {
      onSelectTasks(selectedTaskIds.filter(id => id !== taskId));
    }
  };

  const handleSort = (field: TaskSortOptions['field']) => {
    if (sort.field === field) {
      onSortChange({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTaskEnhanced(taskId);
      onTaskDelete(taskId);
    } catch (error) {
      alert('Failed to delete task');
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusColors = {
    'my-tasks': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'in-progress': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  const SortIcon = ({ field }: { field: TaskSortOptions['field'] }) => {
    if (sort.field !== field) return null;
    return sort.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
            <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">✨</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Tasks Found</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
          Try adjusting your search or filters, or create your first task to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 p-4">
        {tasks.map((task, index) => {
          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
          return (
            <div
              key={task.id}
              className={`group relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-200 shadow-sm hover:shadow-lg overflow-hidden animate-fade-in ${
                isOverdue 
                  ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              {isOverdue && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-red-600 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold">
                  Overdue
                </div>
              )}
              
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="font-semibold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left mb-2 line-clamp-2 transition-colors"
                    >
                      {task.name}
                    </button>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {task.category.replace('-', ' ')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          statusColors[task.status]
                        }`}
                      >
                        {task.status === 'my-tasks' ? 'To Do' : task.status.replace('-', ' ')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          priorityColors[task.priority]
                        }`}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onTaskClick(task)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onTaskEdit(task)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                          title="Edit task"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b-2 border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-6 py-4 text-left">
              <input
                type="checkbox"
                checked={selectedTaskIds.length === tasks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
            </th>
            <th
              onClick={() => handleSort('name')}
              className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Task Name
                <SortIcon field="name" />
              </div>
            </th>
            <th
              onClick={() => handleSort('category')}
              className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Category
                <SortIcon field="category" />
              </div>
            </th>
            <th
              onClick={() => handleSort('status')}
              className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Status
                <SortIcon field="status" />
              </div>
            </th>
            <th
              onClick={() => handleSort('priority')}
              className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Priority
                <SortIcon field="priority" />
              </div>
            </th>
            <th
              onClick={() => handleSort('dueDate')}
              className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Due Date
                <SortIcon field="dueDate" />
              </div>
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {tasks.map((task) => {
            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <tr
                key={task.id}
                className={`group transition-all duration-150 ${
                  isOverdue 
                    ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20' 
                    : 'hover:bg-blue-50/50 dark:hover:bg-gray-750'
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm max-w-md">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors"
                    >
                      {task.name}
                    </button>
                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                    {task.category.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg ${
                      statusColors[task.status]
                    }`}
                  >
                    {task.status === 'my-tasks' ? 'To Do' : task.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                    {isOverdue && (
                      <span className="inline-flex items-center text-xs text-red-600 dark:text-red-400 font-semibold">
                        ⚠️ Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                      title="View details"
                      aria-label="View task details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onTaskEdit(task)}
                      className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200"
                      title="Edit task"
                      aria-label="Edit task"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                      title="Delete"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      </div>
    </>
  );
});
