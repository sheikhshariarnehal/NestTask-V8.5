import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { WifiOff, CloudOff } from 'lucide-react';

export function OfflineBanner() {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-500 dark:bg-amber-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <CloudOff className="h-4 w-4" />
        <p className="text-sm font-medium">
          You're offline. Changes will sync when connection is restored.
        </p>
      </div>
    </div>
  );
}
