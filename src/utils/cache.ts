/**
 * Simple cache utility using localStorage
 * Provides basic get/set/clear operations with expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'nesttask_cache_';

/**
 * Set data in cache
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[Cache] Failed to set cache for ${key}:`, error);
  }
}

/**
 * Get data from cache
 */
export function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    return entry.data;
  } catch (error) {
    console.warn(`[Cache] Failed to get cache for ${key}:`, error);
    return null;
  }
}

/**
 * Check if cache is valid (not expired)
 */
export function isCacheValid(key: string, maxAge: number): boolean {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return false;

    const entry: CacheEntry<any> = JSON.parse(item);
    const age = Date.now() - entry.timestamp;
    return age < maxAge;
  } catch (error) {
    console.warn(`[Cache] Failed to check cache validity for ${key}:`, error);
    return false;
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn(`[Cache] Failed to clear cache for ${key}:`, error);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache] All cache cleared');
  } catch (error) {
    console.warn('[Cache] Failed to clear all cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    return {
      count: keys.length,
      keys: keys.map(k => k.replace(CACHE_PREFIX, ''))
    };
  } catch (error) {
    console.warn('[Cache] Failed to get cache stats:', error);
    return { count: 0, keys: [] };
  }
}
