/**
 * Performance Monitoring Utility for Admin Dashboard
 * Tracks component render times and provides optimization insights
 */

interface PerformanceMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100;
  private enabled = process.env.NODE_ENV === 'development';

  /**
   * Mark the start of a component render
   */
  startRender(componentName: string): number {
    if (!this.enabled) return 0;
    return performance.now();
  }

  /**
   * Mark the end of a component render and record the metric
   */
  endRender(componentName: string, startTime: number, props?: any): void {
    if (!this.enabled || startTime === 0) return;
    
    const renderTime = performance.now() - startTime;
    
    this.metrics.push({
      componentName,
      renderTime,
      timestamp: Date.now(),
      props: props ? this.sanitizeProps(props) : undefined
    });

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Warn if render time is excessive
    if (renderTime > 16.67) { // 60fps threshold
      console.warn(
        `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (>16.67ms)`,
        props ? `with props:` : '',
        props || ''
      );
    }
  }

  /**
   * Get performance metrics for a specific component
   */
  getMetrics(componentName?: string): PerformanceMetric[] {
    if (componentName) {
      return this.metrics.filter(m => m.componentName === componentName);
    }
    return [...this.metrics];
  }

  /**
   * Get average render time for a component
   */
  getAverageRenderTime(componentName: string): number {
    const componentMetrics = this.getMetrics(componentName);
    if (componentMetrics.length === 0) return 0;
    
    const total = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / componentMetrics.length;
  }

  /**
   * Get slowest renders
   */
  getSlowestRenders(limit = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const componentStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();
    
    this.metrics.forEach(metric => {
      const stats = componentStats.get(metric.componentName) || { count: 0, totalTime: 0, avgTime: 0 };
      stats.count++;
      stats.totalTime += metric.renderTime;
      componentStats.set(metric.componentName, stats);
    });

    // Calculate averages
    componentStats.forEach((stats, component) => {
      stats.avgTime = stats.totalTime / stats.count;
    });

    // Generate report
    let report = '\n=== Performance Report ===\n\n';
    
    const sortedComponents = Array.from(componentStats.entries())
      .sort((a, b) => b[1].avgTime - a[1].avgTime);

    sortedComponents.forEach(([component, stats]) => {
      report += `${component}:\n`;
      report += `  Renders: ${stats.count}\n`;
      report += `  Avg Time: ${stats.avgTime.toFixed(2)}ms\n`;
      report += `  Total Time: ${stats.totalTime.toFixed(2)}ms\n`;
      report += `  Status: ${stats.avgTime > 16.67 ? '⚠️  Needs Optimization' : '✅ Good'}\n\n`;
    });

    return report;
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Sanitize props for logging (remove functions and large objects)
   */
  private sanitizeProps(props: any): any {
    const sanitized: any = {};
    
    Object.keys(props).forEach(key => {
      const value = props[key];
      
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (Array.isArray(value)) {
        sanitized[key] = `[Array(${value.length})]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).perfMonitor = performanceMonitor;
}
