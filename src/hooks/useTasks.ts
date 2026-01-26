import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import type { Task, NewTask } from '../types/task';
import { createDebouncedEventHandler } from '../utils/eventDebounce';
import { debugLog, updateDebugState } from '../lib/debug';

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

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

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
      
      console.log('[useTasks] Starting task load', { 
        shouldShowLoading, 
        hasExistingTasks, 
        wasHidden: wasHiddenRef.current,
        userId 
      });
      
      if (isMountedRef.current && shouldShowLoading) {
        setLoading(true);
      }
      loadingRef.current = true;
      if (isMountedRef.current) {
        setError(null);
      }

      // Check session validity - simplified to avoid connection test hanging
      // Session validation is sufficient to ensure database connectivity
      console.log('[useTasks] Checking session validity...');
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        debugLog('TASKS', '⚠️ No session found during task fetch - session may have expired');
        throw new Error('Session expired - please refresh the page');
      }
      
      console.log('[useTasks] Session valid, proceeding with task fetch');
      
      // Log session info for debugging stale app issues
      const expiresAt = session.session.expires_at;
      if (expiresAt) {
        const expiresAtMs = expiresAt * 1000;
        const timeUntilExpiry = expiresAtMs - Date.now();
        debugLog('TASKS', 'Session check during task fetch', {
          expiresInMinutes: Math.round(timeUntilExpiry / 60000),
          isExpired: timeUntilExpiry <= 0,
        });
        
        if (timeUntilExpiry <= 0) {
          debugLog('TASKS', '🔴 SESSION EXPIRED during task fetch!');
          updateDebugState({ isSessionValid: false, hardRefreshNeeded: true });
          throw new Error('Session expired - please login again');
        }
      }
      
      updateDebugState({ connectionState: 'connected' });

      // Check if the request was aborted
      if (signal.aborted) {
        debugLog('TASKS', 'Task loading aborted');
        return;
      }

      // Batch process tasks in chunks for better performance
      const processTasks = async () => {
        // Pass undefined for sectionId as we don't need to filter manually
        debugLog('TASKS', 'Fetching tasks from database...');
        console.log('[useTasks] Starting fetchTasks call for userId:', userId);
        const startTime = Date.now();
        
        try {
          const data = await fetchTasks(userId, undefined);
          const duration = Date.now() - startTime;
          console.log(`[useTasks] ✅ fetchTasks completed: ${data.length} tasks in ${duration}ms`);
          debugLog('TASKS', `✅ Fetched ${data.length} tasks in ${duration}ms`);
          updateDebugState({ lastDataFetch: Date.now() });
          return data;
        } catch (error: any) {
          console.error('[useTasks] ❌ fetchTasks error:', error);
          throw error;
        }
      };
      
      // Use Promise.race to implement timeout with increased timeout value
      const timeoutPromise = new Promise<Task[]>((_, reject) => {
        setTimeout(() => reject(new Error('Task fetch timeout')), TASK_FETCH_TIMEOUT);
      });
      
      const data = await Promise.race([processTasks(), timeoutPromise]);
      
      console.log('[useTasks] Race completed, data received:', data?.length || 0, 'tasks');
      
      // Only update state if component is mounted and request not aborted
      if (isMountedRef.current && !signal.aborted) {
        console.log('[useTasks] Updating state with', data.length, 'tasks');
        setTasks(data);
        
        setError(null);
        lastLoadTimeRef.current = Date.now();
        setRetryCount(0); // Reset retry count on success
        tabSwitchRecoveryRef.current = false; // We've recovered if we were in recovery mode
        debugLog('TASKS', `State updated with ${data.length} tasks`);
        console.log('[useTasks] ✅ State update complete');
      } else {
        console.log('[useTasks] ⚠️ Skipping state update - mounted:', isMountedRef.current, 'aborted:', signal.aborted);
      }
    } catch (err: any) {
      // Only update error state if component is mounted and not aborted
      if (isMountedRef.current && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        debugLog('TASKS', '❌ Error fetching tasks', { error: err.message });
        
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
      console.log('[useTasks] Finally block - resetting loading state');
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        console.log('[useTasks] ✅ Loading state set to false');
      } else {
        console.log('[useTasks] ⚠️ Component unmounted, skipping loading state update');
      }
    }
  }, [userId, retryCount]);

  // Refresh tasks when the app resumes or network reconnects.
  // This covers cases where the WebView stays "visible" while Capacitor is backgrounded.
  useEffect(() => {
    const handleResumeRefresh = async () => {
      const now = Date.now();
      
      // Increase throttle to 5 seconds to prevent rapid-fire refreshes and loops
      if (now - lastResumeRefreshRef.current < 5000) {
        console.log('[useTasks] Resume refresh throttled');
        return;
      }
      lastResumeRefreshRef.current = now;

      if (!userIdRef.current) return;
      
      console.log('[useTasks] Resume detected, validating session first...');
      
      // CRITICAL FIX: Wait for session validation to complete BEFORE fetching data
      // This prevents RLS failures from expired tokens
      try {
        // Create a promise that resolves when session validation completes
        const sessionValidPromise = new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('[useTasks] Session validation timeout, proceeding anyway');
            resolve();
          }, 5000); // 5s timeout - increased to prevent premature timeout
          
          const handler = () => {
            clearTimeout(timeout);
            window.removeEventListener('supabase-session-validated', handler);
            console.log('[useTasks] Session validation complete');
            resolve();
          };
          
          window.addEventListener('supabase-session-validated', handler, { once: true });
        });
        
        // Trigger session validation
        window.dispatchEvent(new CustomEvent('request-session-validation'));
        
        // Wait for validation to complete (with timeout)
        await sessionValidPromise;
        
        console.log('[useTasks] Session validated, now fetching tasks');
        
        // Now fetch tasks with fresh session
        loadTasks({ force: true });
      } catch (error) {
        console.error('[useTasks] Session validation failed:', error);
        // Still try to load tasks - might work if session was valid
        loadTasks({ force: true });
      }
    };

    // Create debounced handler to prevent duplicate calls within 3-second window
    const debouncedRefresh = createDebouncedEventHandler(handleResumeRefresh, 1000);

    // Only listen to critical events - removed redundant ones to prevent duplicate refreshes
    window.addEventListener('app-resume', debouncedRefresh);
    window.addEventListener('supabase-session-refreshed', debouncedRefresh);

    return () => {
      window.removeEventListener('app-resume', debouncedRefresh);
      window.removeEventListener('supabase-session-refreshed', debouncedRefresh);
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