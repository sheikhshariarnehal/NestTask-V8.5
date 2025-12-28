import { useEffect, useState } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineToast() {
  const isOffline = useOfflineStatus();
  const [show, setShow] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setHasBeenOffline(true);
      setShow(true);
    } else if (hasBeenOffline) {
      // Show reconnected message briefly
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, hasBeenOffline]);

  if (!show) return null;

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
          isOffline
            ? 'bg-red-500/90 text-white'
            : 'bg-green-500/90 text-white'
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">You're offline</span>
          </>
        ) : (
          <>
            <Wifi className="h-5 w-5" />
            <span className="font-medium">Back online</span>
          </>
        )}
      </div>
    </div>
  );
} 