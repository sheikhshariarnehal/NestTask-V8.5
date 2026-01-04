import { Suspense, lazy, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { User } from '../../types/auth';

const UserList = lazy(() => import('../../components/admin/UserList').then(module => ({ default: module.UserList })));

interface AdminContext {
  users: User[];
  isSectionAdmin: boolean;
  sectionId?: string;
  deleteUser: (userId: string) => Promise<void>;
  usersLoading: boolean;
}

export function UsersPage() {
  const { users, isSectionAdmin, sectionId, deleteUser, usersLoading } = useOutletContext<AdminContext>();

  // Filter users for section admin
  const filteredUsers = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return users;
    return users.filter(u => u.sectionId === sectionId);
  }, [users, isSectionAdmin, sectionId]);

  return (
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
  );
}
