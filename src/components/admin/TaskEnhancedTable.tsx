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
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
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
      <div className="md:hidden space-y-4">
        {tasks.map((task, index) => {
          const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
          return (
            <div
              key={task.id}
              className={`group relative bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 shadow-md hover:shadow-lg ${
                isOverdue 
                  ? 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/15' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              {isOverdue && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-red-600 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold">
                  Overdue
                </div>
              )}
              
              <div className="p-5">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onTaskClick(task)}
                    className="font-semibold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left mb-2 line-clamp-2 transition-colors"
                  >
                    {task.name}
                  </button>
                  
                  {task.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 mb-4">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                      {task.category.replace('-', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full capitalize whitespace-nowrap ${
                        statusColors[task.status as keyof typeof statusColors] || statusColors['my-tasks']
                      }`}
                    >
                      {task.status === 'my-tasks' ? 'To Do' : task.status === 'pending' ? 'Pending' : task.status.replace('-', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      {isOverdue && (
                        <span className="ml-1 inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <span className="w-1 h-1 bg-red-600 dark:bg-red-400 rounded-full animate-pulse"></span>
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onTaskClick(task)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onTaskEdit(task)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                        title="Edit task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 touch-manipulation active:scale-95"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-800/80 border-b-2 border-gray-200 dark:border-gray-700">
          <tr>
            <th className="w-12 px-6 py-4 text-left">
              <input
                type="checkbox"
                checked={selectedTaskIds.length === tasks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
            </th>
            <th
              onClick={() => handleSort('name')}
              className="w-auto px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Task Name
                <SortIcon field="name" />
              </div>
            </th>
            <th
              onClick={() => handleSort('category')}
              className="w-40 px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Category
                <SortIcon field="category" />
              </div>
            </th>
            <th
              onClick={() => handleSort('status')}
              className="w-32 px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Status
                <SortIcon field="status" />
              </div>
            </th>
            <th
              onClick={() => handleSort('priority')}
              className="w-32 px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Priority
                <SortIcon field="priority" />
              </div>
            </th>
            <th
              onClick={() => handleSort('dueDate')}
              className="w-40 px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                Due Date
                <SortIcon field="dueDate" />
              </div>
            </th>
            <th className="w-36 px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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
                className={`group task-table-row transition-all duration-200 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                  isOverdue 
                    ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/60 dark:hover:bg-red-900/15' 
                    : 'hover:bg-blue-50/30 dark:hover:bg-gray-800/70'
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
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors line-clamp-1"
                    >
                      {task.name}
                    </button>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                    {task.category.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full capitalize whitespace-nowrap ${
                      statusColors[task.status as keyof typeof statusColors] || statusColors['my-tasks']
                    }`}
                  >
                    {task.status === 'my-tasks' ? 'To Do' : task.status === 'pending' ? 'Pending' : task.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full uppercase ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full animate-pulse"></span>
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 task-action-buttons">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                      title="View details"
                      aria-label="View task details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onTaskEdit(task)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:text-gray-400 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                      title="Edit task"
                      aria-label="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      title="Delete"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
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
      </div>
    </>
  );
});
