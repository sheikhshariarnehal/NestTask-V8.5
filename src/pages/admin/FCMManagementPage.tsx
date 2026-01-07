import { useOutletContext } from 'react-router-dom';
import { FCMTokenManager } from '../../components/admin/fcm/FCMTokenManager';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

interface AdminContext {
  isSectionAdmin?: boolean;
  sectionId?: string;
  sectionName?: string;
}

export function FCMManagementPage() {
  const { user } = useAuth();
  const { isSectionAdmin, sectionId, sectionName } = useOutletContext<AdminContext>();

  // Only section admins can access this page
  if (!isSectionAdmin || !sectionId || !user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-semibold mb-1">
                Access Denied
              </h3>
              <p className="text-red-700 dark:text-red-400 text-sm">
                Only section admins can access FCM token management.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FCMTokenManager
      sectionId={sectionId}
      sectionName={sectionName || 'Unknown Section'}
      userId={user.id}
    />
  );
}

export default FCMManagementPage;
