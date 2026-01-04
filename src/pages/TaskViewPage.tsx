import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2, Home } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-20 mx-auto" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading task details...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 animate-pulse mx-auto" />
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto relative" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {error || 'Task not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            The task you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </button>
            <button
              onClick={handleClose}
              className="inline-flex items-center px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show task details
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 animate-fade-in">
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Opening task...</p>
            </div>
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
