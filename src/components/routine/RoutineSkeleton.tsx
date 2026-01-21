/**
 * RoutineSkeleton - A clean, optimized skeleton loader that mirrors the mobile routine UI
 * Fully responsive and matches the exact structure of the routine page
 */
export function RoutineSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
      {/* Header Section Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl mb-3 p-3 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Mobile View Header Skeleton */}
        <div className="flex flex-col space-y-2 sm:hidden">
          <div className="flex items-center justify-between">
            {/* Title skeleton */}
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            {/* Search icon skeleton */}
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          {/* Subtitle skeleton */}
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>

          {/* Section dropdown skeleton */}
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '200ms' }}></div>
        </div>

        {/* Desktop View Header Skeleton */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            {/* Title skeleton */}
            <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
            {/* Subtitle skeleton */}
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
          </div>

          <div className="flex items-center gap-3">
            {/* Section dropdown skeleton */}
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '200ms' }}></div>
            {/* Search input skeleton */}
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>

      {/* Calendar Strip Skeleton */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          {/* Previous button skeleton */}
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>

          {/* Date text skeleton */}
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>

          {/* Next button skeleton */}
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>

        {/* Week days skeleton */}
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`
                flex flex-col items-center py-3 rounded-2xl
                ${i === 1 ? 'bg-blue-100 dark:bg-blue-900/30 shadow-lg scale-105' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}
              `}
            >
              {/* Day name skeleton */}
              <div className={`h-3 w-8 ${i === 1 ? 'bg-blue-300 dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'} rounded mb-1 animate-pulse`} style={{ animationDelay: `${i * 50}ms` }}></div>
              {/* Day number skeleton */}
              <div className={`h-5 w-5 ${i === 1 ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'} rounded animate-pulse`} style={{ animationDelay: `${i * 50 + 25}ms` }}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Class Schedule Skeleton */}
      <div className="space-y-2">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all mb-3 flex"
          >
            {/* Time Column Skeleton */}
            <div className="w-16 sm:w-20 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-between py-3 border-r border-blue-100 dark:border-blue-800/50 flex-shrink-0">
              {/* Start time skeleton */}
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${index * 150}ms` }}></div>

              <div className="flex-1 w-0.5 my-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>

              {/* End time skeleton */}
              <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${index * 150 + 50}ms` }}></div>
            </div>

            {/* Content Column Skeleton */}
            <div className="flex-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-0 min-w-0">
              {/* Course name skeleton */}
              <div className="h-5 w-3/4 sm:w-2/3 bg-gray-200 dark:bg-gray-700 rounded mt-3 mb-2 animate-pulse" style={{ animationDelay: `${index * 150 + 100}ms` }}></div>

              <div className="space-y-1.5">
                {/* Course row */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>

                {/* Section row */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>

                {/* Teacher row */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>

                {/* Room row */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}