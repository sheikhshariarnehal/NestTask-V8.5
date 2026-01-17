import { useState } from 'react';
import { Bell, Loader2, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    isRegistered,
    permissionStatus,
    loading,
    error,
    register,
    unregister,
    isNativePlatform
  } = usePushNotifications();

  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      if (isRegistered) {
        await unregister();
      } else {
        await register();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking notification status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Push Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {!isNativePlatform 
                ? 'Push notifications are available on the mobile app'
                : isRegistered 
                  ? 'You will receive notifications for new tasks and announcements' 
                  : 'Enable notifications to stay updated with new tasks and announcements'
              }
            </p>
          </div>
        </div>

        {isNativePlatform && isSupported && (
          <button
            onClick={handleToggle}
            disabled={isUpdating || permissionStatus === 'denied'}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isRegistered 
                ? 'bg-blue-600 dark:bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700'
              }
              ${(isUpdating || permissionStatus === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={isRegistered}
          >
            <span className="sr-only">
              {isRegistered ? 'Disable notifications' : 'Enable notifications'}
            </span>
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                transition duration-200 ease-in-out
                ${isRegistered ? 'translate-x-5' : 'translate-x-0'}
                ${isUpdating ? 'animate-pulse' : ''}
              `}
            />
          </button>
        )}
      </div>

      {/* Status indicator */}
      {isNativePlatform && (
        <div className="flex items-center gap-2 text-sm">
          {isRegistered ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Push notifications enabled</span>
            </>
          ) : permissionStatus === 'denied' ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">Permission denied - enable in device settings</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Push notifications disabled</span>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Notification Error
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          You will receive notifications for:
        </h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            New tasks assigned to you
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            Important announcements
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            Task status updates
          </li>
        </ul>
      </div>
    </div>
  );
}