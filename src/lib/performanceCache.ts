// Enhanced cache implementation with better expiry and memory management

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Limit cache size to prevent memory issues
  
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }
    
    // Remove half of the remaining entries if still too large
    if (toDelete.length < this.maxSize / 2) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, this.maxSize / 4).forEach(([key]) => toDelete.push(key));
    }
    
    toDelete.forEach(key => this.cache.delete(key));
  }
}

// Request deduplication for identical requests
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already pending, return the same promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Create new request
    const requestPromise = requestFn().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }
  
  clear(): void {
    this.pendingRequests.clear();
  }
}

export const performanceCache = new PerformanceCache();
export const requestDeduplicator = new RequestDeduplicator();

// Enhanced cache keys generator
export const cacheKeys = {
  tasks: (userId: string, filters: string) => `tasks:${userId}:${filters}`,
  users: (sectionId?: string) => `users:${sectionId || 'all'}`,
  sections: () => 'sections:all',
};