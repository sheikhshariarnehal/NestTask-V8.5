import { memo } from 'react';
import { Clock, Database, Zap } from 'lucide-react';

interface PerformanceStatsProps {
  taskCount: number;
  loadTime?: number;
  queryCount?: number;
  cacheHitRate?: number;
}

export const PerformanceStats = memo(({
  taskCount,
  loadTime,
  queryCount = 1,
  cacheHitRate = 0
}: PerformanceStatsProps) => {
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
      <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <Database className="w-3 h-3" />
          <span>{taskCount} tasks</span>
        </div>
        {loadTime && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{loadTime}ms</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>{queryCount} queries</span>
        </div>
        {cacheHitRate > 0 && (
          <div className="flex items-center space-x-1">
            <span>Cache: {(cacheHitRate * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
});

PerformanceStats.displayName = 'PerformanceStats';