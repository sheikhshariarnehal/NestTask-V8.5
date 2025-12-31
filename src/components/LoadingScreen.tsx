import { useEffect, useState, memo, useRef } from 'react';

interface LoadingScreenProps {
  minimumLoadTime?: number;
  showProgress?: boolean;
}

// Using memo for better performance
export const LoadingScreen = memo(function LoadingScreen({ 
  minimumLoadTime = 200,
  showProgress = false 
}: LoadingScreenProps) {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const startTimeRef = useRef(Date.now());
  
  // Simplified effect with improved performance
  useEffect(() => {
    const elapsedTime = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);
    
    // Single timer for fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Faster transition - reduced from 180ms
      setTimeout(() => setShow(false), 120);
    }, remainingTime);

    // Simplified progress updates
    if (showProgress) {
      let progressTimer: number;
      
      const updateProgress = () => {
        // Use larger increments and fewer updates
        setProgress(prev => {
          const newProgress = prev + (prev < 70 ? 20 : prev < 90 ? 10 : 2);
          return Math.min(96, newProgress);
        });
        
        // Decreasing update frequency as progress increases
        const nextInterval = progress < 70 ? 300 : 500;
        progressTimer = window.setTimeout(updateProgress, nextInterval);
      };
      
      progressTimer = window.setTimeout(updateProgress, 100);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(progressTimer);
      };
    }

    return () => clearTimeout(timer);
  }, [minimumLoadTime, showProgress, progress]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50 transition-opacity duration-120 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center">
        {/* Simplified SVG spinner */}
        <svg width="28" height="28" viewBox="0 0 28 28" className="text-blue-600 dark:text-blue-400">
          <circle cx="14" cy="14" r="12" 
            fill="none" 
            stroke="currentColor" 
            strokeOpacity="0.2" 
            strokeWidth="3" 
          />
          <path
            d="M14 2 A12 12 0 0 1 26 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 14 14"
              to="360 14 14"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
        
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-2">
          NestTask
        </div>
        
        {showProgress && (
          <div className="w-24 mx-auto mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-0.5 overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-0.5 rounded-full transition-none" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// CSS for the spinner is in index.html as inline critical CSS
// .spinner {
//   width: 40px;
//   height: 40px;
//   border: 3px solid #e0e7ff;
//   border-radius: 50%;
//   border-top-color: #3b82f6;
//   animation: spin 1s linear infinite;
// }
// @keyframes spin {
//   to { transform: rotate(360deg); }
// }