import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, testConnection, getSessionSafe } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import type { Task, NewTask } from '../types/task';
import { createDebouncedEventHandler } from '../utils/eventDebounce';
import { requestSessionValidation } from '../utils/sessionValidation';
import { Capacitor } from '@capacitor/core';

// Task fetch timeout in milliseconds.
// On Android WebView / mobile networks, 10s was too aggressive after resume and caused false timeouts.
const TASK_FETCH_TIMEOUT = 20000;

// Cache for tasks to avoid refetching
interface TasksCacheEntry {
  tasks: Task[];
  timestamp: number;
}
const tasksCache = new Map<string, TasksCacheEntry>();

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Maximum number of retries for task fetching
const MAX_RETRIES_TIMEOUT = 2;
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
  // Zombie state detection - track when loading started
  const loadingStartedAtRef = useRef<number>(0);
  // Zombie recovery timer
  const zombieRecoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Listen for session-recovered event from cold start token refresh
  useEffect(() => {
    const handleSessionRecovered = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('[useTasks] Session recovered event received, retrying task load...');
      
      // If we're stuck in loading state, retry immediately
      if (loadingRef.current) {
        loadingRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
          setTimeout(() => {
            if (isMountedRef.current && userId) {
              loadTasks({ force: true });
            }
          }, 200);
        }
      }
    };
    
    window.addEventListener('supabase-session-recovered', handleSessionRecovered);
    return () => window.removeEventListener('supabase-session-recovered', handleSessionRecovered);
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
        
        // Removed aggressive loading state reset that was causing race conditions
        // during app resume. loadTasks() handles its own timeouts and cleanup.
        
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

    // Don't start a new load if one is already running, unless forced.
    // IMPORTANT: Do not abort first and then skip — that pattern can cancel the in-flight load
    // and leave the UI in a no-progress state.
    if (loadingRef.current && !options.force) {
      console.log('[useTasks] Loading already in progress, skipping');
      return;
    }

    // Cancel any ongoing request only when we are explicitly forcing a refresh.
    if (options.force && abortControllerRef.current) {
      abortControllerRef.current.abort('superseded');
    }

    // Create a new abort controller for this request
    const requestController = new AbortController();
    abortControllerRef.current = requestController;
    const signal = requestController.signal;
    
    // If force is true, reset recovery mode, retry count, and any stuck states
    if (options.force) {
      tabSwitchRecoveryRef.current = true;
      loadingRef.current = false; // Reset stuck loading state
      if (isMountedRef.current) {
        setRetryCount(0);
      }
    }
    
    // Implement throttling - don't reload if last load was less than 3 seconds ago
    // but reduce to 1 second if we're in tab switch recovery mode
    const now = Date.now();

    // OPTIMIZATION: Check cache first for instant render (network-first strategy)
    // Use aggressive caching (500ms) for perceived instant loading
    if (!options.force && userId && tasksCache.has(userId)) {
      const cached = tasksCache.get(userId)!;
      // Use cache immediately if it's less than 500ms old for instant perceived loading
      // This prevents flickering and provides instant feedback to users
      if (now - cached.timestamp < 500) {
        console.log('[useTasks] ⚡ Using immediate cache (instant render)');
        if (isMountedRef.current) {
          setTasks(cached.tasks);
          setLoading(false);
          loadingRef.current = false;
        }
        return;
      }
      
      // If cache is 500ms-5s old, show cached data immediately but refresh in background
      if (now - cached.timestamp < 5000) {
        console.log('[useTasks] ⚡ Showing cached data, refreshing in background...');
        if (isMountedRef.current) {
          setTasks(cached.tasks);
          setLoading(false); // Don't show loading spinner
        }
        // Continue to background refresh below
      }
    }

    const throttleTime = tabSwitchRecoveryRef.current ? 1000 : 3000;
    if (!options.force && now - lastLoadTimeRef.current < throttleTime) {
      console.log('Task loading throttled - too soon since last load');
      // Ensure we don't get stuck in loading state if we're throttled
      if (isMountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
      return;
    }

    try {
      // Don't show loading indicator if we just came back from hidden state
      // and we already have tasks - this prevents blank screens
      const hasExistingTasks = tasks.length > 0;
      const shouldShowLoading = !wasHiddenRef.current || !hasExistingTasks;
      
      // If we have cached data, don't show full loading state, just background refresh
      // unless force is true
      if (userId && tasksCache.has(userId) && !options.force && hasExistingTasks) {
         // Maybe show a small indicator or nothing
      } else if (isMountedRef.current && shouldShowLoading) {
        setLoading(true);
      }
      
      loadingRef.current = true;
      loadingStartedAtRef.current = Date.now();
      
      // Zombie state detection: if loading takes too long, force recovery
      if (zombieRecoveryTimerRef.current) {
        clearTimeout(zombieRecoveryTimerRef.current);
      }
      zombieRecoveryTimerRef.current = setTimeout(() => {
        if (loadingRef.current && isMountedRef.current) {
          const loadingDuration = Date.now() - loadingStartedAtRef.current;
          console.error(`[useTasks] ZOMBIE STATE DETECTED: Loading for ${Math.round(loadingDuration / 1000)}s`);
          
          // Force recovery: reset loading state and retry with force flag
          loadingRef.current = false;
          if (isMountedRef.current) {
            setLoading(false);
          }
          
          console.log('[useTasks] Zombie recovery: forcing immediate retry...');
          // Retry immediately with force flag to bypass caching/throttling
          setTimeout(() => {
            if (isMountedRef.current) {
              loadTasks({ force: true });
            }
          }, 100);
        }
      }, 20000); // 20 second zombie detection
      if (isMountedRef.current) {
        setError(null);
      }

      // Skip database connection test in development mode
      let isConnected = true;
      if (!import.meta.env.DEV) {
        // SIMPLIFIED: Session validation is already handled by useSupabaseLifecycle and resume handlers
        // We don't need to validate again here - this was causing redundant 2-15 second timeouts
        
        // Test connection before fetching
        // If connection test fails, try to use cache
        isConnected = await testConnection();
        if (!isConnected) {
           if (userId && tasksCache.has(userId)) {
             console.warn('[useTasks] Connection failed, using cache');
             if (isMountedRef.current) {
               setTasks(tasksCache.get(userId)!.tasks);
               setError('Device offline - showing cached tasks');
             }
             return; // Stop here, use cache
           }
           throw new Error('Unable to connect to database');
        }

        // SIMPLIFIED: Session validation is already handled by useSupabaseLifecycle and resume handlers
        // The fetchTasks() service will use getSessionSafe() which handles refresh internally via HTTP bypass
        console.log('[useTasks] Connection OK, proceeding to fetch (session managed by lifecycle hook)');
      }

      // Check if the request was aborted
      if (signal.aborted) {
        console.log('Task loading aborted');
        return;
      }

      // Enforce a hard timeout that ALSO aborts the underlying Supabase request.
      // This prevents hung fetches from piling up across resume/network flaps.
      const taskTimeoutId = window.setTimeout(() => {
        try {
          requestController.abort('timeout');
        } catch {
          // ignore
        }
      }, TASK_FETCH_TIMEOUT);

      let data: Task[];
      try {
        // Pass undefined for sectionId as we don't need to filter manually
        data = await fetchTasks(userId, undefined, signal);
      } finally {
        window.clearTimeout(taskTimeoutId);
      }
      
      // Only update state if component is mounted and request not aborted
      if (isMountedRef.current && !signal.aborted) {
        setTasks(data);
        
        setError(null);
        lastLoadTimeRef.current = Date.now();
        setRetryCount(0); // Reset retry count on success
        tabSwitchRecoveryRef.current = false; // We've recovered if we were in recovery mode
      }
    } catch (err: any) {
      // If the request was intentionally aborted (e.g. superseded by a forced refresh),
      // don't surface an error.
      if (signal.aborted && (signal as any).reason === 'superseded') {
        console.log('Task loading aborted');
        return;
      }

      // CRITICAL FIX: If browser aborted due to offline→online transition, retry immediately
      const isAbortError = err?.name === 'AbortError' || err?.message?.includes('AbortError');
      const wasOfflineNowOnline = isAbortError && navigator.onLine && signal.aborted && !(signal as any).reason;
      
      if (wasOfflineNowOnline) {
        console.log('[useTasks] Browser aborted fetch during offline→online transition, retrying immediately...');
        // Clear loading state to prevent stuck UI
        if (isMountedRef.current) {
          setLoading(false);
          loadingRef.current = false;
        }
        // Retry immediately with force flag to bypass throttling
        setTimeout(() => {
          if (isMountedRef.current) {
            loadTasks({ force: true });
          }
        }, 100);
        return;
      }

      // Only update error state if component is mounted.
      // If the signal was aborted due to our own timeout, we still want to surface the error.
      const abortedDueToTimeout = signal.aborted && (signal as any).reason === 'timeout';
      if (isMountedRef.current && (!signal.aborted || abortedDueToTimeout)) {
        console.error('Error fetching tasks:', err);
        
        // Provide a more informative error message for timeouts
        const isTimeout =
          err?.message === 'Task fetch timeout' ||
          err?.message?.includes('timed out') ||
          (signal.aborted && (signal as any).reason === 'timeout');

        if (isTimeout) {
          setError(`Failed to refresh: Task fetch timeout after ${TASK_FETCH_TIMEOUT / 1000}s. Network may be slow or server overloaded.`);
        } else if (err?.message === 'Task fetch aborted') {
          // Benign abort (e.g. navigation/unmount)
          return;
        } else {
          setError(err.message || 'Failed to load tasks');
        }
        
        // Increase retry limit for timeouts
        const maxRetries = (err?.message === 'Task fetch timeout' || err?.message?.includes('timed out') || (signal.aborted && (signal as any).reason === 'timeout'))
          ? MAX_RETRIES_TIMEOUT
          : MAX_RETRIES_OTHER;
        
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
          console.warn(`Maximum retries (${maxRetries}) reached for task fetching.`);
          
          if (Capacitor.isNativePlatform()) {
             // If we are on native and can't fetch tasks after multiple attempts,
             // the network socket is likely dead. Force a hard reload to recover.
             console.error('[useTasks] Fatal network/session error on native. Forcing app reload.');
             window.location.reload();
          } else {
             tabSwitchRecoveryRef.current = true;
          }
        }
      }
    } finally {
      // Clear zombie detection timer
      if (zombieRecoveryTimerRef.current) {
        clearTimeout(zombieRecoveryTimerRef.current);
        zombieRecoveryTimerRef.current = null;
      }
      
      // Immediately reset loading state - no delay needed
      loadingRef.current = false;
      loadingStartedAtRef.current = 0;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, retryCount]);

  // Refresh tasks when the app resumes or network reconnects.
  // This covers cases where the WebView stays "visible" while Capacitor is backgrounded.
  useEffect(() => {
    const handleResumeRefresh = async () => {
      const now = Date.now();
      
      // Increase throttle to 3 seconds to prevent rapid-fire refreshes
      if (now - lastResumeRefreshRef.current < 3000) {
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
          // Use 15s timeout for native platforms to account for mobile network wake-up latency
          const isNative = Capacitor.isNativePlatform();
          const timeoutDuration = isNative ? 15000 : 10000;
          const validationStartTime = Date.now();
          console.log(`[useTasks] Starting validation wait (timeout: ${timeoutDuration}ms, timestamp: ${validationStartTime})`);
          
          const timeout = setTimeout(() => {
            console.log(`[useTasks] Session validation timeout after ${Date.now() - validationStartTime}ms, proceeding anyway`);
            resolve();
          }, timeoutDuration);
          
          const handler = (e: Event) => {
            const elapsed = Date.now() - validationStartTime;
            const customEvent = e as CustomEvent;
            const success = customEvent.detail?.success;
            clearTimeout(timeout);
            window.removeEventListener('supabase-session-validated', handler);
            console.log(`[useTasks] Session validation event received after ${elapsed}ms (success: ${success})`);
            resolve();
          };
          
          window.addEventListener('supabase-session-validated', handler, { once: true });
        });
        
        // Trigger session validation
        console.log('[useTasks] Dispatching request-session-validation event');
        window.dispatchEvent(new CustomEvent('request-session-validation'));
        
        // Wait for validation to complete (with timeout)
        console.log('[useTasks] Waiting for session validation...');
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
    window.addEventListener('supabase-visibility-refresh', debouncedRefresh);
    window.addEventListener('supabase-network-reconnect', debouncedRefresh);

    return () => {
      window.removeEventListener('app-resume', debouncedRefresh);
      window.removeEventListener('supabase-session-refreshed', debouncedRefresh);
      window.removeEventListener('supabase-visibility-refresh', debouncedRefresh);
      window.removeEventListener('supabase-network-reconnect', debouncedRefresh);
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

      // Clear zombie detection timer
      if (zombieRecoveryTimerRef.current) {
        clearTimeout(zombieRecoveryTimerRef.current);
        zombieRecoveryTimerRef.current = null;
      }

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