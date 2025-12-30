import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../types';

// Lazy load TaskDetailsPopup
const TaskDetailsPopup = lazy(() => 
  import('../components/task/TaskDetailsPopup').then(module => ({ 
    default: module.TaskDetailsPopup 
  }))
);

export function TaskViewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tasks, updateTask, loading: tasksLoading } = useTasks(user?.id);
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Find task from existing tasks or fetch it
  useEffect(() => {
    if (!taskId) {
      setError('No task ID provided');
      setLoading(false);
      return;
    }

    // First try to find in existing tasks
    if (tasks && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === taskId);
      if (foundTask) {
        setTask(foundTask);
        setLoading(false);
        return;
      }
    }

    // If not found and tasks are still loading, wait
    if (tasksLoading) {
      return;
    }

    // Fetch task directly from Supabase
    const fetchTask = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Task not found');
          } else {
            setError(fetchError.message);
          }
          return;
        }

        if (data) {
          // Transform snake_case to camelCase
          const transformedTask: Task = {
            id: data.id,
            name: data.name || data.title || 'Untitled Task',
            description: data.description || '',
            dueDate: data.due_date,
            category: data.category,
            priority: data.priority,
            status: data.status,
            sectionId: data.section_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            isAdminTask: data.is_admin_task || false,
          };
          setTask(transformedTask);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch task');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, tasks, tasksLoading]);

  const handleClose = () => {
    // Navigate back or to home
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: Task['status']) => {
    if (!task) return;
    
    setIsUpdating(true);
    try {
      await updateTask(id, { status: newStatus });
      setTask(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading task...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || 'Task not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The task you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={handleClose}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show task details
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }
      >
        <TaskDetailsPopup
          task={task}
          onClose={handleClose}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={isUpdating}
        />
      </Suspense>
    </div>
  );
}

export default TaskViewPage;
