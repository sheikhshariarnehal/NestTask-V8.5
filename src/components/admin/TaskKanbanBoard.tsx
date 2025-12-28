import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User, Calendar, Tag, AlertCircle, GripVertical } from 'lucide-react';
import type { EnhancedTask } from '../../types/taskEnhanced';
import { TaskStatus } from '../../types/task';
import { updateTaskEnhanced } from '../../services/taskEnhanced.service';

interface TaskKanbanBoardProps {
  tasks: EnhancedTask[];
  onTaskUpdate: (task: EnhancedTask) => void;
  onTaskClick: (task: EnhancedTask) => void;
}

const STATUS_COLUMNS: Array<{ id: TaskStatus; title: string; color: string }> = [
  { id: 'my-tasks', title: 'To Do', color: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600' },
];

export function TaskKanbanBoard({ tasks, onTaskUpdate, onTaskClick }: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<EnhancedTask | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id);
    return acc;
  }, {} as Record<TaskStatus, EnhancedTask[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setIsDragging(true);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      const updatedTask = await updateTaskEnhanced(taskId, { status: newStatus });
      onTaskUpdate(updatedTask);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {STATUS_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            status={column}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: { id: TaskStatus; title: string; color: string };
  tasks: EnhancedTask[];
  onTaskClick: (task: EnhancedTask) => void;
}

function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`${status.color} border-2 rounded-lg p-4 h-full`}>
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {status.title}
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
              ({tasks.length})
            </span>
          </h3>
        </div>

        {/* Tasks */}
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[500px]">
            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p className="text-sm">No tasks</p>
              </div>
            ) : (
              tasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableTaskCardProps {
  task: EnhancedTask;
  onClick: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} onClick={onClick} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface TaskCardProps {
  task: EnhancedTask;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

function TaskCard({ task, onClick, isDragging, dragHandleProps }: TaskCardProps) {
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600
        hover:shadow-md transition-all cursor-pointer group
        ${isDragging ? 'rotate-3 shadow-xl' : ''}
        ${isOverdue ? 'border-l-4 border-l-red-500' : ''}
      `}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing mt-1"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Task Name */}
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
            {task.name}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Priority Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            
            {isOverdue && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-xs"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{task.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {/* Due Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>

            {/* Assigned To */}
            {task.assignedToUser && (
              <div className="flex items-center gap-2">
                <User className="w-3 h-3" />
                <span>{task.assignedToUser.name}</span>
              </div>
            )}

            {/* Category */}
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span className="capitalize">{task.category.replace('-', ' ')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
