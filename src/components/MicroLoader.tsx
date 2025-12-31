import React from 'react';

/**
 * Ultra-lightweight loading spinner component
 * Optimized for minimal repaints and performance
 */
export const MicroLoader: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
    <div className="w-8 h-8 relative">
      <div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
      <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin"></div>
    </div>
  </div>
); 