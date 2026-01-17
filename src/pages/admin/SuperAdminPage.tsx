import { Suspense, lazy } from 'react';

const SuperAdminDashboard = lazy(() => import('../../components/admin/super/SuperAdminDashboardNew').then(module => ({ default: module.SuperAdminDashboard })));

export function SuperAdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="space-y-4 animate-pulse w-full max-w-4xl px-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    }>
      <SuperAdminDashboard />
    </Suspense>
  );
}
