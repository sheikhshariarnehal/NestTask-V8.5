import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const isOffline = useOfflineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setTimeout(() => setShow(true), 100);
    } else {
      setShow(false);
    }
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out ${
        show ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 dark:from-slate-900 dark:via-black dark:to-slate-900 border-b border-slate-700/50 dark:border-slate-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2.5">
          <div className="p-1 rounded-md bg-slate-700/50 dark:bg-slate-800/50">
            <CloudOff className="h-3.5 w-3.5 text-slate-300" strokeWidth={2.5} />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-200 tracking-wide">
            <span className="hidden sm:inline">You're offline. Changes will sync when connection is restored.</span>
            <span className="sm:hidden">Offline mode • Changes will sync later</span>
          </p>
        </div>
      </div>
    </div>
  );
}
