/**
 * Custom hook for cached data fetching
 * Provides automatic caching, deduplication, and loading states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataCache } from '../lib/dataCache';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
      throw error;
    }
    console.log(`[useCachedData] Retrying after ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

interface UseCachedDataOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  ttl?: number; // Time to live in milliseconds
  enabled?: boolean; // Whether to fetch immediately
  onError?: (error: Error) => void;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

export function useCachedData<T>({
  cacheKey,
  fetchFn,
  ttl,
  enabled = true,
  onError
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(() => {
    // Try to get from cache immediately
    return dataCache.get<T>(cacheKey, ttl);
  });
  const [loading, setLoading] = useState<boolean>(!data && enabled);
  const [error, setError] = useState<Error | null>(null);
  const fetchDataRef = useRef<() => Promise<void>>();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use retry logic with exponential backoff
      const result = await retryWithBackoff(() => 
        dataCache.getOrFetch(cacheKey, fetchFn, ttl)
      );
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, ttl, onError]);

  fetchDataRef.current = fetchData;

  const invalidate = useCallback(() => {
    dataCache.invalidate(cacheKey);
    setData(null);
  }, [cacheKey]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Listen for app resume events
  useEffect(() => {
    const handleAppResume = () => {
      console.log(`[useCachedData] App resumed, invalidating cache for ${cacheKey}`);
      dataCache.invalidate(cacheKey);
      if (enabled && fetchDataRef.current) {
        fetchDataRef.current().catch(err => {
          console.error(`[useCachedData] Failed to refetch on resume:`, err);
        });
      }
    };

    const handleSessionRefreshed = () => {
      console.log(`[useCachedData] Session refreshed, refetching ${cacheKey}`);
      if (enabled && fetchDataRef.current) {
        fetchDataRef.current().catch(err => {
          console.error(`[useCachedData] Failed to refetch after session refresh:`, err);
        });
      }
    };

    window.addEventListener('app-resume', handleAppResume);
    window.addEventListener('supabase-session-refreshed', handleSessionRefreshed);

    return () => {
      window.removeEventListener('app-resume', handleAppResume);
      window.removeEventListener('supabase-session-refreshed', handleSessionRefreshed);
    };
  }, [cacheKey, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate
  };
}

/**
 * Hook for fetching multiple pieces of data with caching
 * Useful for batching related queries
 */
export function useCachedBatchData<T extends Record<string, any>>(
  queries: Array<{
    key: string;
    cacheKey: string;
    fetchFn: () => Promise<any>;
    ttl?: number;
  }>,
  enabled: boolean = true
): {
  data: Partial<T>;
  loading: boolean;
  errors: Record<string, Error>;
  refetchAll: () => Promise<void>;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState<boolean>(enabled);
  const [errors, setErrors] = useState<Record<string, Error>>({});

  const fetchAll = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const newErrors: Record<string, Error> = {};
      const newData: Partial<T> = {};

      // Fetch all queries in parallel
      await Promise.allSettled(
        queries.map(async ({ key, cacheKey, fetchFn, ttl }) => {
          try {
            const result = await dataCache.getOrFetch(cacheKey, fetchFn, ttl);
            newData[key as keyof T] = result;
          } catch (err) {
            newErrors[key] = err instanceof Error ? err : new Error('Unknown error');
          }
        })
      );

      setData(newData);
      setErrors(newErrors);
    } finally {
      setLoading(false);
    }
  }, [queries, enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    data,
    loading,
    errors,
    refetchAll: fetchAll
  };
}
