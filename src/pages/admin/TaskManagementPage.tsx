import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const TaskManagerEnhanced = lazy(() => import('../../components/admin/TaskManagerEnhanced').then(module => ({ default: module.TaskManagerEnhanced })));

interface AdminContext {
  isSectionAdmin: boolean;
  sectionId?: string;
  openTaskFormV2: boolean;
  setOpenTaskFormV2: (open: boolean) => void;
}

export function TaskManagementPage() {
  const { user } = useAuth();
  const { isSectionAdmin, sectionId, openTaskFormV2, setOpenTaskFormV2 } = useOutletContext<AdminContext>();

  if (!user) return null;

  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    }>
      <TaskManagerEnhanced 
        userId={user.id}
        sectionId={isSectionAdmin ? sectionId : undefined}
        isSectionAdmin={isSectionAdmin}
        openCreateForm={openTaskFormV2}
        onCloseCreateForm={() => setOpenTaskFormV2(false)}
      />
    </Suspense>
  );
}
