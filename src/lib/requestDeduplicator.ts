/**
 * Request Deduplicator
 * 
 * Prevents duplicate API calls by coalescing concurrent requests for the same resource.
 * If a request with the same key is already in flight, the pending promise is returned
 * instead of making a new request.
 * 
 * This eliminates the 7+ duplicate `users_with_full_info` calls observed in performance traces.
 */

type PendingRequest<T> = Promise<T>;

// Map of in-flight requests
const pendingRequests = new Map<string, PendingRequest<any>>();

// Short-term cache for frequently accessed data (sections, user roles)
// TTL: 60 seconds - enough to prevent duplicate calls during page load
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const shortTermCache = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TTL = 60000; // 60 seconds

// Debug mode for development
const DEBUG = import.meta.env.DEV;

/**
 * Deduplicates async requests by key.
 * 
 * @param key - Unique identifier for the request (e.g., 'users_with_full_info:user-id')
 * @param fetcher - Async function that performs the actual fetch
 * @returns Promise that resolves to the fetched data
 * 
 * @example
 * ```ts
 * const userData = await deduplicate(
 *   `users_with_full_info:${userId}`,
 *   () => supabase.from('users_with_full_info').select('*').eq('id', userId).single()
 * );
 * ```
 */
export async function deduplicate<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if request is already in flight
  if (pendingRequests.has(key)) {
    if (DEBUG) {
      console.log(`[Dedupe] ♻️ Reusing pending request: ${key}`);
    }
    return pendingRequests.get(key)!;
  }

  // Start new request
  if (DEBUG) {
    console.log(`[Dedupe] 🚀 Starting new request: ${key}`);
  }

  const promise = fetcher()
    .then((result) => {
      if (DEBUG) {
        console.log(`[Dedupe] ✅ Completed: ${key}`);
      }
      return result;
    })
    .finally(() => {
      // Clean up after request completes (success or failure)
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Deduplicates and caches async requests.
 * Use this for data that doesn't change frequently (sections, user profiles).
 * 
 * @param key - Unique identifier for the request
 * @param fetcher - Async function that performs the actual fetch
 * @param ttl - Time to live in milliseconds (default: 60 seconds)
 */
export async function deduplicateWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  // Check short-term cache first
  const cached = shortTermCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    if (DEBUG) {
      console.log(`[Dedupe] 💾 Cache hit: ${key}`);
    }
    return cached.data;
  }

  // Use deduplication for the actual request
  const result = await deduplicate(key, fetcher);
  
  // Cache the result
  shortTermCache.set(key, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

/**
 * Clears all pending requests.
 * Useful for cleanup during logout or navigation.
 */
export function clearPendingRequests(): void {
  if (DEBUG && pendingRequests.size > 0) {
    console.log(`[Dedupe] 🧹 Clearing ${pendingRequests.size} pending requests`);
  }
  pendingRequests.clear();
}

/**
 * Clears the short-term cache.
 * Call this on logout or when data needs to be refreshed.
 */
export function clearCache(): void {
  if (DEBUG && shortTermCache.size > 0) {
    console.log(`[Dedupe] 🧹 Clearing ${shortTermCache.size} cached items`);
  }
  shortTermCache.clear();
}

/**
 * Clears both pending requests and cache.
 */
export function clearAll(): void {
  clearPendingRequests();
  clearCache();
}

/**
 * Gets the count of currently pending requests.
 * Useful for debugging.
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Checks if a specific request is currently in flight.
 */
export function isRequestPending(key: string): boolean {
  return pendingRequests.has(key);
}

// Request key generators for common queries
export const requestKeys = {
  userWithFullInfo: (userId: string) => `users_with_full_info:${userId}`,
  userRole: (userId: string) => `user_role:${userId}`,
  section: (sectionId: string) => `section:${sectionId}`,
  sectionUsers: (sectionId: string) => `section_users:${sectionId}`,
  tasks: (params?: string) => `tasks:${params || 'all'}`,
} as const;
