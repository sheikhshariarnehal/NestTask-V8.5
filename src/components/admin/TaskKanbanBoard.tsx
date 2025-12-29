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
import { Clock, Calendar, AlertCircle, GripVertical } from 'lucide-react';
import type { EnhancedTask } from '../../types/taskEnhanced';
import { TaskStatus } from '../../types/task';
import { updateTaskEnhanced } from '../../services/taskEnhanced.service';

interface TaskKanbanBoardProps {
  tasks: EnhancedTask[];
  onTaskUpdate: (task: EnhancedTask) => void;
  onTaskClick: (task: EnhancedTask) => void;
}

const STATUS_COLUMNS: Array<{ id: TaskStatus; title: string; color: string; bgGradient: string }> = [
  { 
    id: 'my-tasks', 
    title: 'To Do', 
    color: 'border-gray-300 dark:border-gray-600',
    bgGradient: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850'
  },
  { 
    id: 'in-progress', 
    title: 'In Progress', 
    color: 'border-orange-300 dark:border-orange-600',
    bgGradient: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'
  },
  { 
    id: 'completed', 
    title: 'Completed', 
    color: 'border-green-300 dark:border-green-600',
    bgGradient: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
  },
];

export const TaskKanbanBoard = React.memo(function TaskKanbanBoard({ tasks, onTaskUpdate, onTaskClick }: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<EnhancedTask | null>(null);

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
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
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
      // Silent fail - could add toast notification here
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-6 min-h-[500px] sm:min-h-[600px] px-4 sm:px-6 py-4 scrollbar-hide">
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
});

interface KanbanColumnProps {
  status: { id: TaskStatus; title: string; color: string; bgGradient: string };
  tasks: EnhancedTask[];
  onTaskClick: (task: EnhancedTask) => void;
}

function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 sm:w-[340px] lg:w-[360px]">
      <div className={`${status.bgGradient} ${status.color} border-2 rounded-2xl p-5 h-full shadow-sm`}>
        {/* Column Header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            {status.title}
          </h3>
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-full text-sm font-semibold shadow-sm">
            {tasks.length}
          </span>
        </div>

        {/* Tasks */}
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[450px]">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center mb-3 shadow-sm">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs mt-1">Drag tasks here</p>
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
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700',
  };

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-750 rounded-xl p-4 shadow-md border-2 border-gray-200 dark:border-gray-600
        hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer group touch-manipulation
        ${isDragging ? 'rotate-2 scale-105 shadow-2xl opacity-75' : ''}
        ${isOverdue ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
      `}
      onClick={onClick}
    >
      {/* Overdue Indicator */}
      {isOverdue && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      )}

      {/* Drag Handle & Content */}
      <div className="flex items-start gap-3">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing mt-1 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Task Name */}
          <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {task.name}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${priorityColors[task.priority]}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium capitalize">
              {task.category.replace('-', ' ')}
            </span>

            {isOverdue && (
              <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-700">
                <AlertCircle className="w-3.5 h-3.5" />
                Overdue
              </span>
            )}
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {new Date(task.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
