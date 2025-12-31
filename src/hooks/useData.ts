import { useState, useEffect, useCallback } from 'react';
import { getCachedData } from '../utils/prefetch';
import { setCache, getCache, isCacheValid } from '../utils/cache';

// In-memory cache for data
const memoryCache = new Map<string, { data: any; timestamp: string }>();

// Cache expiration time in milliseconds (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

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
        const freshData = await fetcher();
        if (isMounted) {
          setData(freshData);
          // Store the fetched data in memory cache
          setCache(cacheKey, freshData);
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
      const freshData = await fetcher();
      setData(freshData);
      setCache(cacheKey, freshData);
      return freshData;
    } catch (err) {
      console.error(`Error refreshing ${cacheKey} data:`, err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher]);

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
 * Hook for accessing routines
 * @param fetcher Function to fetch routines
 */
export function useRoutines<T>(fetcher: () => Promise<T>) {
  return useData('routines', fetcher);
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