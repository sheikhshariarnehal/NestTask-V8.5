import { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EnhancedTask, TaskSortOptions } from '../../types/taskEnhanced';

interface VirtualizedTaskTableProps {
  tasks: EnhancedTask[];
  selectedTaskIds: string[];
  onSelectTasks: (ids: string[]) => void;
  onTaskClick: (task: EnhancedTask) => void;
  onTaskEdit: (task: EnhancedTask) => void;
  onTaskDelete: (taskId: string) => void;
  sort: TaskSortOptions;
  onSortChange: (sort: TaskSortOptions) => void;
  height: number;
}

interface TaskRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tasks: EnhancedTask[];
    selectedTaskIds: string[];
    onSelectTasks: (ids: string[]) => void;
    onTaskClick: (task: EnhancedTask) => void;
    onTaskEdit: (task: EnhancedTask) => void;
    onTaskDelete: (taskId: string) => void;
  };
}

const TaskRow = memo(({ index, style, data }: TaskRowProps) => {
  const {
    tasks,
    selectedTaskIds,
    onSelectTasks,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
  } = data;
  
  const task = tasks[index];
  const isSelected = selectedTaskIds.includes(task.id);

  const handleSelect = () => {
    if (isSelected) {
      onSelectTasks(selectedTaskIds.filter(id => id !== task.id));
    } else {
      onSelectTasks([...selectedTaskIds, task.id]);
    }
  };

  return (
    <div 
      style={style}
      className={`flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleSelect}
        className="mr-3"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onTaskClick(task)}
              className="text-left truncate text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
              {task.name}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {task.description}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <span className={`px-2 py-1 text-xs rounded-full ${
              task.priority === 'high' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : task.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {task.priority}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              task.status === 'completed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : task.status === 'in-progress'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
            }`}>
              {task.status}
            </span>
            <button
              onClick={() => onTaskEdit(task)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onTaskDelete(task.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const VirtualizedTaskTable = memo(({
  tasks,
  selectedTaskIds,
  onSelectTasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  sort,
  onSortChange,
  height = 600,
}: VirtualizedTaskTableProps) => {
  const itemData = {
    tasks,
    selectedTaskIds,
    onSelectTasks,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectTasks(tasks.map(t => t.id));
              } else {
                onSelectTasks([]);
              }
            }}
            className="mr-3"
          />
          <div className="flex-1 grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            <button
              onClick={() => onSortChange({
                field: 'name',
                direction: sort.field === 'name' && sort.direction === 'asc' ? 'desc' : 'asc'
              })}
              className="text-left hover:text-gray-900 dark:hover:text-white"
            >
              Task Name {sort.field === 'name' && (sort.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => onSortChange({
                field: 'category',
                direction: sort.field === 'category' && sort.direction === 'asc' ? 'desc' : 'asc'
              })}
              className="text-left hover:text-gray-900 dark:hover:text-white"
            >
              Category {sort.field === 'category' && (sort.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => onSortChange({
                field: 'dueDate',
                direction: sort.field === 'dueDate' && sort.direction === 'asc' ? 'desc' : 'asc'
              })}
              className="text-left hover:text-gray-900 dark:hover:text-white"
            >
              Due Date {sort.field === 'dueDate' && (sort.direction === 'asc' ? '↑' : '↓')}
            </button>
            <span>Actions</span>
          </div>
        </div>
      </div>
      
      {/* Virtualized List */}
      <List
        height={height}
        itemCount={tasks.length}
        itemSize={80}
        itemData={itemData}
        overscanCount={5}
      >
        {TaskRow}
      </List>
    </div>
  );
});

VirtualizedTaskTable.displayName = 'VirtualizedTaskTable';
TaskRow.displayName = 'TaskRow';