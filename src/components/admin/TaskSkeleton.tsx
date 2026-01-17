import React from 'react';

export const TaskTableSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 overflow-hidden relative"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="absolute inset-0 shimmer"></div>
            <div className="flex items-start gap-3 relative">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  <div className="flex gap-1">
                    <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Skeleton */}
      <div className="hidden md:block">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm relative">
          <div className="absolute inset-0 shimmer z-10 pointer-events-none"></div>
          <table className="w-full relative z-0">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b-2 border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </th>
                <th className="px-6 py-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                  <td className="px-6 py-4">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const TaskKanbanSkeleton = () => {
  return (
    <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-6 min-h-[500px] px-4 sm:px-6 py-4 scrollbar-hide">
      {[1, 2, 3].map((col) => (
        <div 
          key={col} 
          className="flex-shrink-0 w-80 sm:w-[340px] lg:w-[360px]"
          style={{ animationDelay: `${col * 0.1}s` }}
        >
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-5 h-full shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 shimmer z-10 pointer-events-none"></div>
            
            {/* Column Header Skeleton */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-200 dark:border-gray-600 relative z-0">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>

            {/* Task Cards Skeleton */}
            <div className="space-y-3 relative z-0">
              {[1, 2, 3, 4].map((card) => (
                <div
                  key={card}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 shadow-md border-2 border-gray-200 dark:border-gray-600"
                  style={{ animationDelay: `${(col * 0.1) + (card * 0.05)}s` }}
                >
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-16"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                    </div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TaskAnalyticsSkeleton = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="absolute inset-0 shimmer"></div>
            <div className="flex items-center justify-between mb-3 relative">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2 relative"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 relative"></div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden"
            style={{ animationDelay: `${(i + 4) * 0.1}s` }}
          >
            <div className="absolute inset-0 shimmer"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 relative"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded relative"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
