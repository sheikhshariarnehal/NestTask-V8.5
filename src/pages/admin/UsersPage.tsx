import { Suspense, lazy, useMemo, memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { User } from '../../types/auth';
import type { Task } from '../../types/index';

// Lazy load individual components for better code splitting
const UserList = lazy(() => import('../../components/admin/UserList').then(m => ({ default: m.UserList })));
const UserStats = lazy(() => import('../../components/admin/UserStats').then(m => ({ default: m.UserStats })));
const UserActiveGraph = lazy(() => import('../../components/admin/dashboard/UserActiveGraph').then(m => ({ default: m.UserActiveGraph })));
const UserActivity = lazy(() => import('../../components/admin/UserActivity').then(m => ({ default: m.UserActivity })));

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="md:col-span-2 h-[500px] md:h-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="md:col-span-1 h-[500px] md:h-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
    </div>
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  </div>
);

interface AdminContext {
  users: User[];
  tasks: Task[];
  isSectionAdmin: boolean;
  sectionId?: string;
  deleteUser: (userId: string) => Promise<void>;
  usersLoading: boolean;
  tasksLoading: boolean;
}

// Memoize the component to prevent unnecessary re-renders
export const UsersPage = memo(function UsersPage() {
  const { users, tasks, isSectionAdmin, sectionId, deleteUser, usersLoading } = useOutletContext<AdminContext>();

  // Filter users for section admin - memoized for performance
  const filteredUsers = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return users;
    return users.filter(u => u.sectionId === sectionId);
  }, [users, isSectionAdmin, sectionId]);

  // Filter tasks for section admin - memoized for performance
  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return tasks;
    return tasks.filter(t => t.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<LoadingSkeleton />}>
        {/* User Statistics */}
        <UserStats users={filteredUsers} tasks={filteredTasks} />

        {/* User Activity Trends and Recent Activity Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* User Activity Graph - Takes 2/3 width on desktop */}
          <div className="md:col-span-2">
            <UserActiveGraph users={filteredUsers} />
          </div>

          {/* Recent User Activity - Takes 1/3 width on desktop */}
          <div className="md:col-span-1">
            <UserActivity users={filteredUsers} />
          </div>
        </div>

        {/* User List */}
        <UserList 
          users={filteredUsers} 
          onDeleteUser={deleteUser}
          isLoading={usersLoading}
        />
      </Suspense>
    </div>
  );
});
