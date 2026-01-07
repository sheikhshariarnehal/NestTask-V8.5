import { useState, useEffect, useCallback, useRef } from 'react';
import { getCachedData } from '../utils/prefetch';
import { setCache, getCache, isCacheValid, clearCache as clearUtilsCache } from '../utils/cache';

// In-memory cache for data
const memoryCache = new Map<string, { data: any; timestamp: string }>();

// Cache expiration time in milliseconds (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) {
      throw error;
    }

    // Don't retry on certain errors
    if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
      throw error;
    }

    console.log(`[useData] Retrying after ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Custom hook for managing data access with simple in-memory caching
 * @param cacheKey The cache key to use
 * @param fetcher Function to fetch data
 * @param dependencies Array of dependencies that should trigger a refetch
 */
export function useData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  expirationTime: number = CACHE_EXPIRATION
) {
  const [data, setData] = useState<T | null>(() => {
    // Initialize with cached data if available
    return getCache<T>(cacheKey);
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Load data with dependencies
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      // Skip fetching if we already have valid cached data
      if (isCacheValid(cacheKey, expirationTime) && data) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use retry logic with exponential backoff
        const freshData = await retryWithBackoff(() => fetcher());
        if (isMounted) {
          setData(freshData);
          // Store the fetched data in memory cache
          setCache(cacheKey, freshData);
          lastFetchTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error(`Error fetching ${cacheKey} data:`, err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [...dependencies, cacheKey]);

  // Function to force refresh data
  const refreshData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      // Use retry logic
      const freshData = await retryWithBackoff(() => fetcher());
      setData(freshData);
      setCache(cacheKey, freshData);
      lastFetchTimeRef.current = Date.now();
      return freshData;
    } catch (err) {
      console.error(`Error refreshing ${cacheKey} data:`, err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher]);

  // Listen for app resume events to invalidate cache and refetch
  useEffect(() => {
    const handleAppResume = () => {
      console.log(`[useData] App resumed, invalidating cache for ${cacheKey}`);
      // Clear cache for this key
      clearUtilsCache(cacheKey);
      // Refetch data after resume
      refreshData().catch(err => {
        console.error(`[useData] Failed to refresh data on resume for ${cacheKey}:`, err);
      });
    };

    const handleSessionRefreshed = () => {
      console.log(`[useData] Session refreshed, refetching ${cacheKey}`);
      // Refetch data after session refresh
      refreshData().catch(err => {
        console.error(`[useData] Failed to refresh data after session refresh for ${cacheKey}:`, err);
      });
    };

    window.addEventListener('app-resume', handleAppResume);
    window.addEventListener('supabase-session-refreshed', handleSessionRefreshed);

    return () => {
      window.removeEventListener('app-resume', handleAppResume);
      window.removeEventListener('supabase-session-refreshed', handleSessionRefreshed);
    };
  }, [cacheKey, refreshData]);

  return { data, loading, error, refreshData };
}

/**
 * Hook for accessing tasks
 * @param fetcher Function to fetch tasks
 */
export function useTasks<T>(fetcher: () => Promise<T>) {
  return useData('tasks', fetcher);
}

/**
 * Hook for accessing user data
 * @param fetcher Function to fetch user data
 */
export function useUserData<T>(fetcher: () => Promise<T>) {
  return useData('user_data', fetcher);
}

/**
 * Clear all cached data
 */
export function clearCache() {
  memoryCache.clear();
} 