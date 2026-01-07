/**
 * Prefetch utilities for optimizing data loading
 */

import { setCache, getCache } from './cache';

/**
 * Get cached data
 */
export function getCachedData<T>(key: string): T | null {
  return getCache<T>(key);
}

/**
 * Prefetch API data and cache it
 */
export async function prefetchApiData<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const data = await fetcher();
    setCache(key, data);
    return data;
  } catch (error) {
    console.error(`[Prefetch] Failed to prefetch ${key}:`, error);
    throw error;
  }
}

/**
 * Prefetch a route by lazy loading its component
 */
export async function prefetchRoute(importFn: () => Promise<any>): Promise<void> {
  try {
    await importFn();
    console.log('[Prefetch] Route prefetched successfully');
  } catch (error) {
    console.error('[Prefetch] Failed to prefetch route:', error);
  }
}

/**
 * Batch prefetch multiple data sources
 */
export async function batchPrefetch(
  tasks: Array<{ key: string; fetcher: () => Promise<any> }>
): Promise<void> {
  try {
    await Promise.allSettled(
      tasks.map(({ key, fetcher }) => prefetchApiData(key, fetcher))
    );
    console.log('[Prefetch] Batch prefetch completed');
  } catch (error) {
    console.error('[Prefetch] Batch prefetch failed:', error);
  }
}
