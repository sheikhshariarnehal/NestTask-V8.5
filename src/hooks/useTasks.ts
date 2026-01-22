import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import type { Task, NewTask } from '../types/task';

// Task fetch timeout in milliseconds (increased from 20 seconds to 45 seconds)
const TASK_FETCH_TIMEOUT = 45000;

// Cache for tasks to avoid refetching
interface TasksCacheEntry {
  tasks: Task[];
  timestamp: number;
}
const tasksCache = new Map<string, TasksCacheEntry>();

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Maximum number of retries for task fetching
const MAX_RETRIES_TIMEOUT = 5;
const MAX_RETRIES_OTHER = 3;

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Track if a request is in progress to prevent duplicate requests
  const loadingRef = useRef(false);
  // Track the last successful load time to prevent too frequent refreshes
  const lastLoadTimeRef = useRef(0);
  // Track if component is mounted
  const isMountedRef = useRef(true);
  // Track abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track user id for cache key generation
  const userIdRef = useRef<string | undefined>(userId);
  // Track if we're in tab switch recovery mode
  const tabSwitchRecoveryRef = useRef(false);
  // Track if the page was recently hidden
  const wasHiddenRef = useRef(false);
  // Track the last visibility change time
  const lastVisibilityChangeRef = useRef(Date.now());
  // Throttle resume-triggered refreshes
  const lastResumeRefreshRef = useRef<number>(0);
  // Track loading start time for stuck state recovery
  const loadingStartTimeRef = useRef<number>(0);
  // Stuck state recovery timeout ref
  const stuckRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Stuck state recovery: if loading takes more than 10 seconds, auto-recover
  useEffect(() => {
    if (loading && loadingStartTimeRef.current > 0) {
      // Clear any existing timeout
      if (stuckRecoveryTimeoutRef.current) {
        clearTimeout(stuckRecoveryTimeoutRef.current);
      }
      
      // Set a recovery timeout
      stuckRecoveryTimeoutRef.current = setTimeout(() => {
        if (loadingRef.current && isMountedRef.current) {
          console.warn('[useTasks] Stuck state detected after 10s, auto-recovering');
          loadingRef.current = false;
          setLoading(false);
          setError('Loading timed out. Please refresh to try again.');
          
          // Dispatch a custom event to notify the app of stuck recovery
          window.dispatchEvent(new CustomEvent('task-loading-stuck-recovered'));
        }
      }, 10000);
      
      return () => {
        if (stuckRecoveryTimeoutRef.current) {
          clearTimeout(stuckRecoveryTimeoutRef.current);
        }
      };
    }
  }, [loading]);

  // Track page visibility to prevent blank screens and recover from stuck states
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
        lastVisibilityChangeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        // Mark that we came back from hidden
        const hiddenDuration = Date.now() - lastVisibilityChangeRef.current;
        lastVisibilityChangeRef.current = Date.now();
        
        // CRITICAL: Reset stuck loading state when app becomes visible
        // This prevents the app from being stuck on loading after minimize/restore
        if (loadingRef.current) {
          console.log('[useTasks] Resetting stuck loading state after visibility change');
          loadingRef.current = false;
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
        
        // Only mark as recent tab switch if hidden for less than 30 seconds
        // This prevents showing loading state immediately after tab switch
        if (hiddenDuration < 30000) {
          wasHiddenRef.current = true;
          // Clear the flag after a short delay
          setTimeout(() => {
            wasHiddenRef.current = false;
          }, 1000);
        } else {
          wasHiddenRef.current = false;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadTasks = useCallback(async (options: { force?: boolean } = {}) => {
    if (!userId) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // If force is true, clear cache for hard refresh
    if (options.force) {
      console.log('[useTasks] Force refresh - clearing cache');
      tasksCache.delete(userId); // Clear task cache for this user
      tabSwitchRecoveryRef.current = true;
      loadingRef.current = false; // Reset stuck loading state
      if (isMountedRef.current) {
        setRetryCount(0);
      }
    }
    
    // Don't reload if a request is already in progress, unless forced
    if (loadingRef.current && !options.force) {
      console.log('[useTasks] Loading already in progress, skipping');
      return;
    }
    
    // Implement throttling - don't reload if last load was less than 3 seconds ago
    // but reduce to 1 second if we're in tab switch recovery mode
    const now = Date.now();
    const throttleTime = tabSwitchRecoveryRef.current ? 1000 : 3000;
    if (!options.force && now - lastLoadTimeRef.current < throttleTime) {
      console.log('Task loading throttled - too soon since last load');
      return;
    }

    try {
      // Don't show loading indicator if we just came back from hidden state
      // and we already have tasks - this prevents blank screens
      const hasExistingTasks = tasks.length > 0;
      const shouldShowLoading = !wasHiddenRef.current || !hasExistingTasks;
      
      // Track loading start time for stuck state recovery
      loadingStartTimeRef.current = Date.now();
      
      if (isMountedRef.current && shouldShowLoading) {
        setLoading(true);
      }
      loadingRef.current = true;
      if (isMountedRef.current) {
        setError(null);
      }

      // Skip database connection test in development mode
      let isConnected = true;
      if (process.env.NODE_ENV !== 'development') {
        // Get user data to check role and section
        const { data: { user } } = await supabase.auth.getUser();

        // Test connection before fetching
        isConnected = await testConnection();
        if (!isConnected) {
          throw new Error('Unable to connect to database');
        }

        // Check session - if no session, just return without reloading
        // The auth flow will handle redirecting to login if needed
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          console.log('No session found during task fetch, skipping reload');
          throw new Error('Session expired - please refresh the page');
        }
      }

      // Check if the request was aborted
      if (signal.aborted) {
        console.log('Task loading aborted');
        return;
      }

      // Batch process tasks in chunks for better performance
      const processTasks = async () => {
        // Pass undefined for sectionId as we don't need to filter manually
        const data = await fetchTasks(userId, undefined);
        return data;
      };
      
      // Use Promise.race to implement timeout with increased timeout value
      const timeoutPromise = new Promise<Task[]>((_, reject) => {
        setTimeout(() => reject(new Error('Task fetch timeout')), TASK_FETCH_TIMEOUT);
      });
      
      const data = await Promise.race([processTasks(), timeoutPromise]);
      
      // Only update state if component is mounted and request not aborted
      if (isMountedRef.current && !signal.aborted) {
        setTasks(data);
        
        setError(null);
        lastLoadTimeRef.current = Date.now();
        setRetryCount(0); // Reset retry count on success
        tabSwitchRecoveryRef.current = false; // We've recovered if we were in recovery mode
      }
    } catch (err: any) {
      // Only update error state if component is mounted and not aborted
      if (isMountedRef.current && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        console.error('Error fetching tasks:', err);
        
        // Provide a more informative error message for timeouts
        if (err.message === 'Task fetch timeout') {
          setError(`Failed to refresh: Task fetch timeout after ${TASK_FETCH_TIMEOUT/1000}s. Network may be slow or server overloaded.`);
        } else {
          setError(err.message || 'Failed to load tasks');
        }
        
        // Increase retry limit for timeouts
        const maxRetries = err.message === 'Task fetch timeout' ? MAX_RETRIES_TIMEOUT : MAX_RETRIES_OTHER;
        
        if (retryCount < maxRetries) {
          // Use exponential backoff with some randomness
          const randomOffset = Math.floor(Math.random() * 1000);
          const timeout = Math.min(1000 * Math.pow(2, retryCount) + randomOffset, 15000);
          
          console.log(`Retrying task fetch in ${timeout}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(prev => prev + 1);
            }
          }, timeout);
        } else if (retryCount >= maxRetries) {
          // After max retries, we should try to reset and make a forced refresh
          // next time the user interacts or becomes active
          tabSwitchRecoveryRef.current = true;
          console.warn(`Maximum retries (${maxRetries}) reached for task fetching. Will force refresh next time.`);
        }
      }
    } finally {
      // Immediately reset loading state - no delay needed
      loadingRef.current = false;
      loadingStartTimeRef.current = 0; // Reset loading start time
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, retryCount]);

  // Refresh tasks when the app resumes (coordinated by useAppResumeCoordinator)
  useEffect(() => {
    const handleResumeReady = () => {
      if (!userIdRef.current) return;
      
      console.log('[useTasks] Resume ready - refreshing tasks');
      loadTasks({ force: true });
    };

    // Listen to coordinated resume event (session already validated, channels cleaned)
    window.addEventListener('app-resume-ready', handleResumeReady);

    return () => {
      window.removeEventListener('app-resume-ready', handleResumeReady);
    };
  }, [loadTasks]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Set mounted ref
    isMountedRef.current = true;
    
    // Initial load - show loading immediately, then fetch.
    // This makes initial skeletons (e.g., Home task cards) reliably visible.
    setLoading(true);

    // Initial load - fetch data once on mount
    loadTasks();

    // No realtime subscriptions - user must manually refresh

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;

      // Abort any in-progress request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, loadTasks]);

  const handleCreateTask = async (newTask: NewTask, sectionId?: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Reset any stuck loading state before creating task
    if (loadingRef.current) {
      console.log('[useTasks] Resetting stuck loading state before task creation');
      loadingRef.current = false;
    }

    try {
      const createdTask = await createTask(userId, newTask, sectionId);
      if (isMountedRef.current) {
        setTasks(prev => [...prev, createdTask]);
        
        // Update cache
        if (tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: [...cachedData.tasks, createdTask],
            timestamp: Date.now()
          });
        }
      }
      return createdTask;
    } catch (err: any) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTask(taskId, updates);
      if (isMountedRef.current) {
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updatedTask } : task
        ));
        
        // Update cache
        if (userId && tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: cachedData.tasks.map(task => 
              task.id === taskId ? { ...task, ...updatedTask } : task
            ),
            timestamp: Date.now()
          });
        }
      }
      return updatedTask;
    } catch (err: any) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      if (isMountedRef.current) {
        // Update local state
        setTasks(prev => prev.filter(task => task.id !== taskId));
        
        // Update cache
        if (userId && tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: cachedData.tasks.filter(task => task.id !== taskId),
            timestamp: Date.now()
          });
        }
      }
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  /**
   * Refresh tasks with optimized loading
   * @param force - Force refresh bypassing cache and throttle
   * @returns Promise that resolves when refresh is complete
   */
  const refreshTasks = useCallback(async (force = false): Promise<boolean> => {
    try {
      await loadTasks({ force });
      return true;
    } catch (error) {
      console.error('[useTasks] Refresh failed:', error);
      return false;
    }
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    refreshTasks
  };
}