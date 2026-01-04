import { Suspense, lazy, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { User } from '../../types/auth';
import type { Task } from '../../types/index';

const UserList = lazy(() => import('../../components/admin/UserList').then(module => ({ default: module.UserList })));
const UserStats = lazy(() => import('../../components/admin/UserStats').then(module => ({ default: module.UserStats })));
const UserActiveGraph = lazy(() => import('../../components/admin/dashboard/UserActiveGraph').then(module => ({ default: module.UserActiveGraph })));
const UserActivity = lazy(() => import('../../components/admin/UserActivity').then(module => ({ default: module.UserActivity })));

interface AdminContext {
  users: User[];
  tasks: Task[];
  isSectionAdmin: boolean;
  sectionId?: string;
  deleteUser: (userId: string) => Promise<void>;
  usersLoading: boolean;
  tasksLoading: boolean;
}

export function UsersPage() {
  const { users, tasks, isSectionAdmin, sectionId, deleteUser, usersLoading } = useOutletContext<AdminContext>();

  // Filter users for section admin
  const filteredUsers = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return users;
    return users.filter(u => u.sectionId === sectionId);
  }, [users, isSectionAdmin, sectionId]);

  // Filter tasks for section admin
  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return tasks;
    return tasks.filter(t => t.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <Suspense fallback={
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      }>
        <UserStats users={filteredUsers} tasks={filteredTasks} />
      </Suspense>

      {/* User Activity Trends and Recent Activity Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* User Activity Graph - Takes 2/3 width on desktop */}
        <div className="md:col-span-2">
          <Suspense fallback={
            <div className="h-[500px] md:h-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          }>
            <UserActiveGraph users={filteredUsers} />
          </Suspense>
        </div>

        {/* Recent User Activity - Takes 1/3 width on desktop */}
        <div className="md:col-span-1">
          <Suspense fallback={
            <div className="h-[500px] md:h-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          }>
            <UserActivity users={filteredUsers} />
          </Suspense>
        </div>
      </div>

      {/* User List */}
      <Suspense fallback={
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      }>
        <UserList 
          users={filteredUsers} 
          onDeleteUser={deleteUser}
          isLoading={usersLoading}
        />
      </Suspense>
    </div>
  );
}
