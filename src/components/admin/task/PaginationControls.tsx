import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  totalItems: number;
}

export function PaginationControls({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when not in an input field
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' || 
          document.activeElement?.tagName === 'SELECT') {
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          // Previous page
          if (page > 1) {
            setPage(page - 1);
          }
          break;
        case 'ArrowRight':
          // Next page
          if (page < totalPages) {
            setPage(page + 1);
          }
          break;
        case 'Home':
          // First page
          setPage(1);
          break;
        case 'End':
          // Last page
          setPage(totalPages);
          break;
        default:
          return;
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [page, totalPages, setPage]);

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
          <span className="hidden sm:inline">Showing </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {Math.min((page - 1) * pageSize + 1, totalItems)}
          </span>
          <span> - </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {Math.min(page * pageSize, totalItems)}
          </span>
          <span> of </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{totalItems}</span>
          <span className="hidden sm:inline"> items</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-center gap-1 order-2 sm:order-1">
            <button 
              onClick={() => setPage(1)} 
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100 dark:focus:bg-gray-700"
              aria-label="First page"
              title="First page"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button 
              onClick={() => setPage(Math.max(1, page - 1))} 
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100 dark:focus:bg-gray-700"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="hidden sm:flex">
              {/* First 3 pages */}
              {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => {
                if (i + 1 > totalPages) return null;
                return (
                  <button
                    key={`page-${i+1}`}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                      page === i + 1 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    aria-label={`Page ${i + 1}`}
                    aria-current={page === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                );
              })}
              
              {/* Ellipsis if needed */}
              {totalPages > 6 && page > 3 && (
                <span className="w-8 h-8 flex items-center justify-center text-gray-500">
                  ...
                </span>
              )}
              
              {/* Middle pages */}
              {totalPages > 6 ? 
                Array.from({ length: 3 }).map((_, i) => {
                  const pageNumber = Math.min(
                    Math.max(page - 1 + i, 4),
                    totalPages - 3
                  );
                  
                  // Only show if in valid range
                  if (pageNumber <= 3 || pageNumber > totalPages - 3) return null;
                  
                  return (
                    <button
                      key={`page-${pageNumber}`}
                      onClick={() => setPage(pageNumber)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                        page === pageNumber 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={page === pageNumber ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                }) : null
              }
              
              {/* Second ellipsis if needed */}
              {totalPages > 6 && page < totalPages - 2 && (
                <span className="w-8 h-8 flex items-center justify-center text-gray-500">
                  ...
                </span>
              )}
              
              {/* Last 3 pages (if more than 3 pages total) */}
              {totalPages > 3 &&
                Array.from({ length: Math.min(3, totalPages) }).map((_, i) => {
                  const pageNumber = totalPages - 2 + i;
                  if (pageNumber < 4) return null;
                  
                  return (
                    <button
                      key={`page-${pageNumber}`}
                      onClick={() => setPage(pageNumber)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                        page === pageNumber 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={page === pageNumber ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                })
              }
            </div>
            
            {/* Mobile page indicator */}
            <div className="flex sm:hidden px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg items-center min-w-[80px] justify-center">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= totalPages) {
                    setPage(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-10 bg-transparent border-none text-center text-sm font-medium focus:outline-none"
                aria-label="Current page"
              />
              <span className="text-xs text-gray-500">/ {totalPages}</span>
            </div>
            
            <button 
              onClick={() => setPage(Math.min(totalPages, page + 1))} 
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100 dark:focus:bg-gray-700"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(totalPages)} 
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100 dark:focus:bg-gray-700"
              aria-label="Last page"
              title="Last page"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          
          {/* Jump to page - Desktop */}
          <div className="hidden sm:flex items-center space-x-2 order-3">
            <span className="text-xs text-gray-500">Go to:</span>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= totalPages) {
                    setPage(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-14 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                aria-label="Go to page"
              />
            </div>
          </div>
          
          {/* Page size selector */}
          <div className="flex items-center space-x-2 ml-auto sm:ml-0 order-1 sm:order-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value);
                // Adjust current page to maintain approximate scroll position
                const firstItemIndex = (page - 1) * pageSize + 1;
                const newPage = Math.max(1, Math.ceil(firstItemIndex / newPageSize));
                setPageSize(newPageSize);
                setPage(newPage);
              }}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-1 pl-2 pr-8 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              aria-label="Items per page"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
} 