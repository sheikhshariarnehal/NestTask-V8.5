import { useState } from 'react';
import { Trash2, AlertTriangle, Search } from 'lucide-react';
import { User } from '../../types/auth';

interface UserListProps {
  users: User[];
  onDeleteUser: (userId: string) => Promise<void>;
  onPromoteUser?: (userId: string) => Promise<void>;
  onDemoteUser?: (userId: string) => Promise<void>;
  isSectionAdmin?: boolean;
  isLoading?: boolean;
}

export function UserList({ 
  users, 
  onDeleteUser, 
  onPromoteUser, 
  onDemoteUser, 
  isSectionAdmin = false,
  isLoading = false 
}: UserListProps) {
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to check if a user is a section admin
  const isSectionAdminRole = (role: string) => role === 'section_admin';

  const handleDeleteClick = (user: User) => {
    // Check if section admin is trying to delete user from different section
    const currentSectionAdmin = users.find(u => isSectionAdminRole(u.role));
    if (isSectionAdmin && user.sectionId !== currentSectionAdmin?.sectionId) {
      setError('You can only delete users from your own section');
      return;
    }

    // Don't allow deletion of admins or other section admins
    if (user.role === 'admin' || user.role === 'super-admin' || isSectionAdminRole(user.role)) {
      setError('You cannot delete administrators');
      return;
    }

    setSelectedUser(user);
    setShowConfirmation(true);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      setDeletingUserId(selectedUser.id);
      setError(null);
      await onDeleteUser(selectedUser.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
      setShowConfirmation(false);
      setSelectedUser(null);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.sectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.sectionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If section admin, only show users from their section
  const displayUsers = isSectionAdmin 
    ? filteredUsers.filter(user => user.sectionId === users.find(u => isSectionAdminRole(u.role))?.sectionId)
    : filteredUsers;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              displayUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {user.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.sectionName || (user.sectionId ? `Section ${user.sectionId}` : 'N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : isSectionAdminRole(user.role)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : isSectionAdminRole(user.role) ? 'Section Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteClick(user)}
                      disabled={
                        deletingUserId === user.id || 
                        user.role === 'admin' || 
                        user.role === 'super-admin' || 
                        isSectionAdminRole(user.role) ||
                        (isSectionAdmin && user.sectionId !== users.find(u => isSectionAdminRole(u.role))?.sectionId)
                      }
                      className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {showConfirmation && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete User
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete {selectedUser.name || selectedUser.email}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingUserId === selectedUser.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deletingUserId === selectedUser.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}