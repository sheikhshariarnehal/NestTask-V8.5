import { Suspense, lazy, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Task } from '../../types/index';
import type { NewTask } from '../../types/task';

const TaskManager = lazy(() => import('../../components/admin/TaskManager').then(module => ({ default: module.TaskManager })));

interface AdminContext {
  tasks: Task[];
  isSectionAdmin: boolean;
  sectionId?: string;
  tasksLoading: boolean;
  onCreateTask: (task: NewTask, sectionId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export function TasksPage() {
  const { tasks, isSectionAdmin, sectionId, tasksLoading, onCreateTask, onDeleteTask, onUpdateTask } = useOutletContext<AdminContext>();
  const [showTaskForm] = useState(true);

  // Filter tasks for section admin
  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return tasks;
    return tasks.filter(t => t.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);

  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    }>
      <TaskManager 
        tasks={filteredTasks}
        onCreateTask={onCreateTask}
        onDeleteTask={onDeleteTask}
        onUpdateTask={onUpdateTask}
        showTaskForm={showTaskForm}
        sectionId={isSectionAdmin ? sectionId : undefined}
        isLoading={tasksLoading}
      />
    </Suspense>
  );
}
