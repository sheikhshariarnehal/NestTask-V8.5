/**
 * Simple in-memory data cache with TTL (Time To Live)
 * Prevents duplicate API requests and improves performance
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>; // Store in-flight promises to prevent duplicate requests
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  
  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string, ttl?: number): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const maxAge = ttl ?? this.defaultTTL;
    const isExpired = Date.now() - item.timestamp > maxAge;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Set data in cache with current timestamp
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get or set with a factory function
   * This helps prevent duplicate API calls for the same data
   * Enhanced with aggressive deduplication
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if we have cached data
    const cached = this.get<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }

    // Check if there's an in-flight request for this key
    const item = this.cache.get(key);
    if (item?.promise) {
      // Return the existing promise to deduplicate requests
      return item.promise;
    }

    // Create new request and store the promise
    const promise = fetchFn();
    
    // Store the promise with data placeholder
    this.cache.set(key, {
      data: null,
      timestamp: Date.now(),
      promise
    });

    try {
      const data = await promise;
      // Store the resolved data and clear the promise
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(key);
      throw error;
    }
  }

  /**
   * Invalidate (remove) specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear all cache and notify listeners
   */
  clearAll(): void {
    console.log('[DataCache] Clearing all cache');
    this.cache.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cache-cleared'));
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Set up periodic cleanup (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup();
  }, 5 * 60 * 1000);

  // Clear cache on app resume to ensure fresh data
  window.addEventListener('app-resume', () => {
    console.log('[DataCache] App resumed, clearing cache');
    dataCache.clearAll();
  });

  // Clear cache when session is refreshed
  window.addEventListener('supabase-session-refreshed', () => {
    console.log('[DataCache] Session refreshed, clearing cache');
    dataCache.clearAll();
  });
}

// Helper function to generate cache keys
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userWithFullInfo: (userId: string) => `user_full:${userId}`,
  department: (deptId: string) => `department:${deptId}`,
  departments: () => 'departments:all',
  batch: (batchId: string) => `batch:${batchId}`,
  batches: (deptId?: string) => deptId ? `batches:dept:${deptId}` : 'batches:all',
  section: (sectionId: string) => `section:${sectionId}`,
  sections: (batchId?: string) => batchId ? `sections:batch:${batchId}` : 'sections:all',
  tasks: (userId: string) => `tasks:${userId}`,
  tasksEnhanced: (userId: string, filters?: string) => filters ? `tasks_enhanced:${userId}:${filters}` : `tasks_enhanced:${userId}`,
  taskById: (taskId: string) => `task:${taskId}`,
  announcements: () => 'announcements:all',
  sectionUsers: (sectionId: string) => `section_users:${sectionId}`,
  userRole: (userId: string) => `user_role:${userId}`,
};
