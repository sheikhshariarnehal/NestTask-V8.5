import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  RefreshCw, 
  AlertCircle, 
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Users,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Label } from '../../ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogBody,
  DialogFooter
} from '../../ui/dialog';
import {
  fetchAllUsers,
  fetchDepartments,
  fetchBatches,
  fetchSections,
  createUser,
  updateUser,
  deleteUserById,
  changeUserRole,
  getUserStats,
  searchUsers,
  filterUsersByRole,
  type UserRecord,
  type Department,
  type Batch,
  type Section,
  type CreateUserData,
  type UpdateUserData
} from '../../../services/superadmin.service';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';

type UserRole = 'user' | 'admin' | 'section_admin' | 'super-admin';

// Role configuration for display
const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ComponentType<any>; badgeVariant: any }> = {
  'super-admin': { 
    label: 'Super Admin', 
    color: 'text-red-600 dark:text-red-400', 
    icon: Crown,
    badgeVariant: 'destructive' as const
  },
  'admin': { 
    label: 'Admin', 
    color: 'text-blue-600 dark:text-blue-400', 
    icon: ShieldCheck,
    badgeVariant: 'info' as const
  },
  'section_admin': { 
    label: 'Section Admin', 
    color: 'text-orange-600 dark:text-orange-400', 
    icon: Shield,
    badgeVariant: 'warning' as const
  },
  'user': { 
    label: 'User', 
    color: 'text-gray-600 dark:text-gray-400', 
    icon: User,
    badgeVariant: 'secondary' as const
  },
};

// User Form Modal Component
interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user: UserRecord | null;
  departments: Department[];
  batches: Batch[];
  sections: Section[];
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  mode: 'create' | 'edit';
}

function UserFormModal({ 
  open, 
  onClose, 
  user, 
  departments, 
  batches, 
  sections, 
  onSubmit,
  mode 
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as UserRole,
    phone: '',
    student_id: '',
    department_id: '',
    batch_id: '',
    section_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);

  // Initialize form data when user changes
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        email: user.email || '',
        password: '',
        name: user.name || '',
        role: user.role,
        phone: user.phone || '',
        student_id: user.student_id || '',
        department_id: user.department_id || '',
        batch_id: user.batch_id || '',
        section_id: user.section_id || ''
      });
    } else {
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
        phone: '',
        student_id: '',
        department_id: '',
        batch_id: '',
        section_id: ''
      });
    }
  }, [user, mode, open]);

  // Filter batches when department changes
  useEffect(() => {
    if (formData.department_id) {
      setFilteredBatches(batches.filter(b => b.department_id === formData.department_id));
    } else {
      setFilteredBatches(batches);
    }
  }, [formData.department_id, batches]);

  // Filter sections when batch changes
  useEffect(() => {
    if (formData.batch_id) {
      setFilteredSections(sections.filter(s => s.batch_id === formData.batch_id));
    } else {
      setFilteredSections(sections);
    }
  }, [formData.batch_id, sections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create' && (!formData.email || !formData.password)) {
      showErrorToast('Email and password are required');
      return;
    }

    if (!formData.name) {
      showErrorToast('Name is required');
      return;
    }

    setLoading(true);
    try {
      const submitData = mode === 'create' 
        ? formData as CreateUserData
        : {
            name: formData.name,
            role: formData.role,
            phone: formData.phone || undefined,
            student_id: formData.student_id || undefined,
            department_id: formData.department_id || undefined,
            batch_id: formData.batch_id || undefined,
            section_id: formData.section_id || undefined,
          } as UpdateUserData;

      await onSubmit(submitData);
      onClose();
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New User' : 'Edit User'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Add a new user to the system with specified role and details.'
              : `Update user information for ${user?.name || user?.email}`
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm"
                >
                  <option value="user">User</option>
                  <option value="section_admin">Section Admin</option>
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  placeholder="STU-123456"
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                />
              </div>
            </div>

            {/* Organization Section */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Organization</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.department_id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      department_id: e.target.value,
                      batch_id: '',
                      section_id: ''
                    }))}
                    className="w-full h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <select
                    id="batch"
                    value={formData.batch_id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      batch_id: e.target.value,
                      section_id: ''
                    }))}
                    className="w-full h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm"
                    disabled={!formData.department_id}
                  >
                    <option value="">Select Batch</option>
                    {filteredBatches.map(batch => (
                      <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    value={formData.section_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                    className="w-full h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm"
                    disabled={!formData.batch_id}
                  >
                    <option value="">Select Section</option>
                    {filteredSections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Role Change Modal Component
interface RoleChangeModalProps {
  open: boolean;
  onClose: () => void;
  user: UserRecord | null;
  sections: Section[];
  onRoleChange: (userId: string, role: UserRole, sectionId?: string) => Promise<void>;
}

function RoleChangeModal({ open, onClose, user, sections, onRoleChange }: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedSection(user.section_id || '');
    }
  }, [user, open]);

  const handleSubmit = async () => {
    if (!user) return;
    
    if (selectedRole === 'section_admin' && !selectedSection) {
      showErrorToast('Please select a section for section admin');
      return;
    }

    setLoading(true);
    try {
      await onRoleChange(user.id, selectedRole, selectedSection || undefined);
      showSuccessToast(`Role changed to ${roleConfig[selectedRole].label}`);
      onClose();
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Change the role for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>
        
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-lg">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              <Badge variant={roleConfig[user.role].badgeVariant} className="mt-1">
                Current: {roleConfig[user.role].label}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-all ${
                      selectedRole === role 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRole === 'section_admin' && (
            <div className="space-y-2">
              <Label>Assign to Section *</Label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm"
              >
                <option value="">Select Section</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedRole === user.role}>
            {loading ? 'Updating...' : 'Change Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Modal
interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onDelete: (userId: string) => Promise<void>;
}

function DeleteModal({ open, onClose, user, onDelete }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await onDelete(user.id);
      showSuccessToast('User deleted successfully');
      onClose();
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const canDelete = confirmText.toLowerCase() === 'delete';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete User</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account.
          </DialogDescription>
        </DialogHeader>
        
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 text-lg">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              <Badge variant={roleConfig[user.role].badgeVariant} className="mt-1">
                {roleConfig[user.role].label}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type "delete" to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              className="border-red-200 dark:border-red-800 focus:border-red-500"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading || !canDelete}
          >
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Action Dropdown Component
interface ActionDropdownProps {
  user: UserRecord;
  onEdit: () => void;
  onChangeRole: () => void;
  onDelete: () => void;
}

function ActionDropdown({ onEdit, onChangeRole, onDelete }: ActionDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setOpen(!open)}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
      
      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 py-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit User
            </button>
            <button
              onClick={() => { onChangeRole(); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Change Role
            </button>
            <div className="border-t border-gray-200 dark:border-gray-800 my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete User
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

function StatsCard({ title, value, icon: Icon, color, bgColor }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export function SectionAdminManagementNew() {
  // State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modal states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, deptsData, batchesData, sectionsData] = await Promise.all([
        fetchAllUsers(),
        fetchDepartments(),
        fetchBatches(),
        fetchSections()
      ]);

      setUsers(usersData);
      setDepartments(deptsData);
      setBatches(batchesData);
      setSections(sectionsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showErrorToast(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Computed values
  const stats = useMemo(() => getUserStats(users), [users]);
  
  const filteredUsers = useMemo(() => {
    let result = searchUsers(users, searchTerm);
    result = filterUsersByRole(result, roleFilter);
    return result;
  }, [users, searchTerm, roleFilter]);

  // Handlers
  const handleCreateUser = async (data: CreateUserData | UpdateUserData) => {
    await createUser(data as CreateUserData);
    showSuccessToast('User created successfully');
    await fetchData();
  };

  const handleUpdateUser = async (data: CreateUserData | UpdateUserData) => {
    if (!selectedUser) return;
    await updateUser(selectedUser.id, data as UpdateUserData);
    showSuccessToast('User updated successfully');
    await fetchData();
  };

  const handleChangeRole = async (userId: string, role: UserRole, sectionId?: string) => {
    await changeUserRole(userId, role, sectionId);
    await fetchData();
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserById(userId);
    await fetchData();
  };

  // Open modals
  const openCreateModal = () => {
    setSelectedUser(null);
    setFormMode('create');
    setShowUserForm(true);
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setFormMode('edit');
    setShowUserForm(true);
  };

  const openRoleModal = (user: UserRecord) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const openDeleteModal = (user: UserRecord) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Get department/batch/section names
  const getDepartmentName = (id: string | null) => {
    if (!id) return '—';
    return departments.find(d => d.id === id)?.name || '—';
  };

  const getSectionName = (id: string | null) => {
    if (!id) return '—';
    return sections.find(s => s.id === id)?.name || '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage all users, roles and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatsCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users}
          color="text-gray-700 dark:text-gray-300"
          bgColor="bg-gray-100 dark:bg-gray-800"
        />
        <StatsCard 
          title="Super Admins" 
          value={stats.superAdmins} 
          icon={Crown}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-100 dark:bg-red-900/30"
        />
        <StatsCard 
          title="Admins" 
          value={stats.admins} 
          icon={ShieldCheck}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatsCard 
          title="Section Admins" 
          value={stats.sectionAdmins} 
          icon={Shield}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatsCard 
          title="Regular Users" 
          value={stats.regularUsers} 
          icon={User}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatsCard 
          title="Active (7d)" 
          value={stats.activeUsers} 
          icon={Calendar}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, student ID or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-sm min-w-[150px]"
            >
              <option value="all">All Roles</option>
              <option value="super-admin">Super Admins</option>
              <option value="admin">Admins</option>
              <option value="section_admin">Section Admins</option>
              <option value="user">Users</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({filteredUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden md:table-cell">Section</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleConfig[user.role]?.icon || User;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {user.name || '—'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className={`w-4 h-4 ${roleConfig[user.role]?.color || ''}`} />
                            <Badge variant={roleConfig[user.role]?.badgeVariant || 'secondary'}>
                              {roleConfig[user.role]?.label || user.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-600 dark:text-gray-400">
                          {getDepartmentName(user.department_id)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-gray-600 dark:text-gray-400">
                          {getSectionName(user.section_id)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-600 dark:text-gray-400">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRoleModal(user)}
                              className="hidden sm:inline-flex"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Role
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(user)}
                              className="hidden sm:inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(user)}
                              className="hidden sm:inline-flex text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <div className="sm:hidden">
                              <ActionDropdown
                                user={user}
                                onEdit={() => openEditModal(user)}
                                onChangeRole={() => openRoleModal(user)}
                                onDelete={() => openDeleteModal(user)}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserFormModal
        open={showUserForm}
        onClose={() => setShowUserForm(false)}
        user={selectedUser}
        departments={departments}
        batches={batches}
        sections={sections}
        onSubmit={formMode === 'create' ? handleCreateUser : handleUpdateUser}
        mode={formMode}
      />

      <RoleChangeModal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        user={selectedUser}
        sections={sections}
        onRoleChange={handleChangeRole}
      />

      <DeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        user={selectedUser}
        onDelete={handleDeleteUser}
      />
    </div>
  );
}
