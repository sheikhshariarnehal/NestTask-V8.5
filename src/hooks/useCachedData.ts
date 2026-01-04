/**
 * Custom hook for cached data fetching
 * Provides automatic caching, deduplication, and loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { dataCache } from '../lib/dataCache';

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dataCache.getOrFetch(cacheKey, fetchFn, ttl);
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

  const invalidate = useCallback(() => {
    dataCache.invalidate(cacheKey);
    setData(null);
  }, [cacheKey]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

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
