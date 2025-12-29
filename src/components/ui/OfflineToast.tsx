import { useEffect, useState } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineToast() {
  const isOffline = useOfflineStatus();
  const [show, setShow] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setHasBeenOffline(true);
      setShow(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else if (hasBeenOffline) {
      // Show reconnected message briefly
      setShow(true);
      setTimeout(() => setIsAnimating(true), 10);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => setShow(false), 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, hasBeenOffline]);

  if (!show) return null;

  return (
    <div 
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
        isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border ${
          isOffline
            ? 'bg-slate-800/95 dark:bg-slate-900/95 text-white border-slate-700/50'
            : 'bg-emerald-600/95 dark:bg-emerald-700/95 text-white border-emerald-500/50'
        }`}
      >
        <div className={`p-1.5 rounded-lg ${
          isOffline 
            ? 'bg-slate-700/50' 
            : 'bg-emerald-500/50'
        }`}>
          {isOffline ? (
            <WifiOff className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <Wifi className="h-4 w-4" strokeWidth={2.5} />
          )}
        </div>
        <span className="text-sm font-medium tracking-wide">
          {isOffline ? 'You\'re offline' : 'Back online'}
        </span>
      </div>
    </div>
  );
} 