import { Suspense, lazy, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserStats } from '../../components/admin/UserStats';
import { UserActivity } from '../../components/admin/UserActivity';
import type { User } from '../../types/auth';
import type { Task } from '../../types/index';

const Dashboard = lazy(() => import('../../components/admin/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const UserActiveGraph = lazy(() => import('../../components/admin/dashboard/UserActiveGraph').then(module => ({ default: module.UserActiveGraph })));

interface AdminContext {
  users: User[];
  tasks: Task[];
  isSectionAdmin: boolean;
  sectionId?: string;
  sectionName?: string;
  deleteUser: (userId: string) => void;
  usersLoading: boolean;
  tasksLoading: boolean;
}

export function DashboardPage() {
  const { users, tasks, isSectionAdmin, sectionId } = useOutletContext<AdminContext>();

  // Filter data for section admin
  const filteredUsers = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return users;
    return users.filter(u => u.sectionId === sectionId);
  }, [users, isSectionAdmin, sectionId]);

  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return tasks;
    return tasks.filter(t => t.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);

  return (
    <div className="space-y-6">
      {/* Main Dashboard Stats and Graphs */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      }>
        <Dashboard users={filteredUsers} tasks={filteredTasks} />
      </Suspense>

      {/* User Statistics */}
      <UserStats users={filteredUsers} tasks={filteredTasks} />

      {/* User Activity Graph */}
      <Suspense fallback={
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      }>
        <UserActiveGraph users={filteredUsers} />
      </Suspense>

      {/* Recent User Activity */}
      <UserActivity users={filteredUsers} />
    </div>
  );
}
