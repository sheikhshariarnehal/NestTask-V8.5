/**
 * Resource Preloading and Optimization Utilities
 * Manages critical resource loading for optimal performance
 */

interface PreloadOptions {
  as: 'script' | 'style' | 'image' | 'font' | 'fetch';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  fetchPriority?: 'high' | 'low' | 'auto';
}

class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private preconnectedOrigins = new Set<string>();

  /**
   * Preload a critical resource
   */
  preload(href: string, options: PreloadOptions): void {
    if (typeof window === 'undefined' || this.preloadedResources.has(href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = options.as;
    
    if (options.type) {
      link.type = options.type;
    }
    
    if (options.crossOrigin) {
      link.crossOrigin = options.crossOrigin;
    }
    
    if (options.fetchPriority) {
      link.setAttribute('fetchpriority', options.fetchPriority);
    }

    document.head.appendChild(link);
    this.preloadedResources.add(href);
  }

  /**
   * Preconnect to an origin for faster subsequent requests
   */
  preconnect(origin: string, crossOrigin = false): void {
    if (typeof window === 'undefined' || this.preconnectedOrigins.has(origin)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    
    if (crossOrigin) {
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
    this.preconnectedOrigins.add(origin);

    // Also add dns-prefetch as fallback
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = origin;
    document.head.appendChild(dnsLink);
  }

  /**
   * Prefetch a resource for future navigation
   */
  prefetch(href: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  /**
   * Preload critical API endpoints
   */
  preloadCriticalAPIs(baseUrl: string, endpoints: string[]): void {
    endpoints.forEach(endpoint => {
      this.preload(`${baseUrl}${endpoint}`, {
        as: 'fetch',
        crossOrigin: 'anonymous',
        fetchPriority: 'high'
      });
    });
  }

  /**
   * Setup performance optimizations on app init
   */
  initializeOptimizations(): void {
    if (typeof window === 'undefined') return;

    // Preconnect to critical origins
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nglfbbdoyyfslzyjarqs.supabase.co';
    this.preconnect(supabaseUrl, true);

    // Preconnect to analytics if enabled
    if (import.meta.env.PROD) {
      this.preconnect('https://vitals.vercel-insights.com', true);
      this.preconnect('https://va.vercel-scripts.com', true);
    }

    // Enable resource hints for modern browsers
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      
      // Adjust strategy based on connection type
      if (connection.effectiveType === '4g' || connection.effectiveType === 'wifi') {
        console.log('[ResourcePreloader] Fast connection detected, enabling aggressive preloading');
      } else {
        console.log('[ResourcePreloader] Slow connection detected, using conservative preloading');
      }
    }
  }

  /**
   * Warm up critical caches
   */
  async warmupCache(): Promise<void> {
    if (typeof window === 'undefined') return;

    // This can be extended to preload critical data
    console.log('[ResourcePreloader] Cache warmup initiated');
  }
}

// Export singleton instance
export const resourcePreloader = new ResourcePreloader();

/**
 * Initialize resource preloading on app start
 */
export function initResourcePreloading(): void {
  resourcePreloader.initializeOptimizations();
}
