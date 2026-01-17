import { Suspense, lazy, useMemo, memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { User } from '../../types/auth';
import type { Task } from '../../types/index';

// Bundle all user-related components together for better code splitting
// This reduces the number of network requests and improves loading performance
const UserComponents = lazy(() => 
  Promise.all([
    import('../../components/admin/UserList'),
    import('../../components/admin/UserStats'),
    import('../../components/admin/dashboard/UserActiveGraph'),
    import('../../components/admin/UserActivity')
  ]).then(([userList, userStats, userActiveGraph, userActivity]) => ({
    default: {
      UserList: userList.UserList,
      UserStats: userStats.UserStats,
      UserActiveGraph: userActiveGraph.UserActiveGraph,
      UserActivity: userActivity.UserActivity
    }
  }))
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
      {/* Load all components together to reduce network waterfalls */}
      <Suspense fallback={
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
      }>
        <UserComponents>
          {({ UserStats, UserActiveGraph, UserActivity, UserList }) => (
            <>
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
            </>
          )}
        </UserComponents>
      </Suspense>
    </div>
  );
});
