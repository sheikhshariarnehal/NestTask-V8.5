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
