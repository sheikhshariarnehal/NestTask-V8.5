import React from 'react';
import { ChevronUp, ChevronDown, Edit2, Trash2, Eye, Calendar, User, Tag } from 'lucide-react';
import type { EnhancedTask, TaskSortOptions } from '../../types/taskEnhanced';
import { deleteTaskEnhanced } from '../../services/taskEnhanced.service';

interface TaskEnhancedTableProps {
  tasks: EnhancedTask[];
  selectedTaskIds: string[];
  onSelectTasks: (ids: string[]) => void;
  onTaskClick: (task: EnhancedTask) => void;
  onTaskUpdate: (task: EnhancedTask) => void;
  onTaskDelete: (taskId: string) => void;
  sort: TaskSortOptions;
  onSortChange: (sort: TaskSortOptions) => void;
}

export function TaskEnhancedTable({
  tasks,
  selectedTaskIds,
  onSelectTasks,
  onTaskClick,
  onTaskUpdate,
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
      console.error('Failed to delete task:', error);
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
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">No tasks found</p>
        <p className="text-sm mt-2">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedTaskIds.length === tasks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
            </th>
            <th
              onClick={() => handleSort('name')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center gap-2">
                Task Name
                <SortIcon field="name" />
              </div>
            </th>
            <th
              onClick={() => handleSort('category')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center gap-2">
                Category
                <SortIcon field="category" />
              </div>
            </th>
            <th
              onClick={() => handleSort('status')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center gap-2">
                Status
                <SortIcon field="status" />
              </div>
            </th>
            <th
              onClick={() => handleSort('priority')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center gap-2">
                Priority
                <SortIcon field="priority" />
              </div>
            </th>
            <th
              onClick={() => handleSort('dueDate')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center gap-2">
                Due Date
                <SortIcon field="dueDate" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tags
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {tasks.map((task) => {
            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left"
                    >
                      {task.name}
                    </button>
                    {task.description && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {task.category.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[task.status]
                    }`}
                  >
                    {task.status === 'my-tasks' ? 'To Do' : task.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    {new Date(task.dueDate).toLocaleDateString()}
                    {isOverdue && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {task.assignedToUser ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <User className="w-4 h-4" />
                      {task.assignedToUser.name}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.tags && task.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{task.tags.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">No tags</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
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
  );
}
