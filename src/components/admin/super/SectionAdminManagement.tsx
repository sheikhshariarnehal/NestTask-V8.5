import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Shield, Trash2, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronRight, BookOpen, Layers, User, Download, AlertTriangle,
  ChevronLeft, ChevronUp, Info, PlusCircle, Loader
} from 'lucide-react';
import { AdminUser } from '../../../types/admin';
import { Department, Batch, Section } from '../../../types/auth';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';
import { 
  fetchSections, 
  promoteUserToSectionAdmin, 
  demoteUser
} from '../../../services/admin.service';

// Import directly from the service for our local handlers
import { createTestUsers as createTestUsersService } from '../../../services/admin.service';

interface SectionAdminManagementProps {
  admins: AdminUser[];
  loading: boolean;
  error: string | null;
  onPromoteToSectionAdmin: (id: string) => Promise<void>;
  onDemoteUser: (id: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onGetSectionUsers: (sectionId: string) => Promise<AdminUser[]>;
  onGetSections: (batchId?: string, departmentId?: string) => Promise<any[]>;
  onRefresh: () => Promise<void>;
  departments: Department[];
  batches: Batch[];
  sections: Section[];
}

export function SectionAdminManagement({
  admins,
  loading,
  error,
  onPromoteToSectionAdmin,
  onDemoteUser,
  onDeleteUser,
  onGetSectionUsers,
  onGetSections,
  onRefresh,
  departments,
  batches,
  sections
}: SectionAdminManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [sectionUsers, setSectionUsers] = useState<AdminUser[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'promote' | 'demote' | 'delete';
    userId: string;
    userName: string;
  } | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [testUserCount, setTestUserCount] = useState(5);
  const [showTestUserForm, setShowTestUserForm] = useState(false);
  
  // Filter batches when department changes
  useEffect(() => {
    if (selectedDepartment) {
      const filtered = batches.filter(batch => batch.departmentId === selectedDepartment);
      setFilteredBatches(filtered);
      setSelectedBatch(null);
      setSelectedSection(null);
    } else {
      setFilteredBatches([]);
      setSelectedBatch(null);
      setSelectedSection(null);
    }
  }, [selectedDepartment, batches]);
  
  // Filter sections when batch changes
  useEffect(() => {
    if (selectedBatch) {
      const filtered = sections.filter(section => section.batchId === selectedBatch);
      setFilteredSections(filtered);
      setSelectedSection(null);
    } else {
      setFilteredSections([]);
      setSelectedSection(null);
    }
  }, [selectedBatch, sections]);
  
  // Fetch users for selected section
  useEffect(() => {
    if (selectedSection) {
      loadSectionUsers(selectedSection);
      // Reset pagination when section changes
      setCurrentPage(1);
    } else {
      setSectionUsers([]);
    }
  }, [selectedSection]);
  
  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set to ascending by default
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Calculate pagination indexes
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  
  // Sort and filter users
  const sortedAndFilteredUsers = useMemo(() => {
    if (!sectionUsers.length) return [];
    
    // First filter based on search term
    let filtered = sectionUsers.filter(user => {
      if (!searchTerm) return true;
      
      const term = searchTerm.toLowerCase();
      return (
        (user.username || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.studentId || '').toLowerCase().includes(term) ||
        (user.role || '').toLowerCase().includes(term)
      );
    });
    
    // Then sort based on current sort settings
    return [...filtered].sort((a, b) => {
      let valueA, valueB;
      
      switch (sortColumn) {
        case 'name':
          valueA = a.username || '';
          valueB = b.username || '';
          break;
        case 'email':
          valueA = a.email || '';
          valueB = b.email || '';
          break;
        case 'role':
          valueA = a.role || '';
          valueB = b.role || '';
          break;
        case 'studentId':
          valueA = a.studentId || '';
          valueB = b.studentId || '';
          break;
        default:
          valueA = a.username || '';
          valueB = b.username || '';
      }
      
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
  }, [sectionUsers, searchTerm, sortColumn, sortDirection]);
  
  // Get current users for pagination
  const currentUsers = useMemo(() => {
    setTotalUsers(sortedAndFilteredUsers.length);
    return sortedAndFilteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  }, [sortedAndFilteredUsers, indexOfFirstUser, indexOfLastUser]);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  
  const loadSectionUsers = async (sectionId: string) => {
    setSectionLoading(true);
    try {
      console.log(`------ LOADING SECTION USERS ------`);
      console.log(`Loading users for section: ${sectionId}`);
      console.log(`Departments:`, departments);
      console.log(`Selected department: ${selectedDepartment}`);
      console.log(`Batches:`, batches);
      console.log(`Selected batch: ${selectedBatch}`);
      console.log(`Sections:`, sections);
      console.log(`Selected section: ${selectedSection}`);
      
      // Add a delay to make sure logs display before API call
      await new Promise(r => setTimeout(r, 500));
      
      const users = await onGetSectionUsers(sectionId);
      console.log(`Received section users:`, users);
      setSectionUsers(users);
      
      // Get section name for success message
      const sectionName = sections.find(s => s.id === sectionId)?.name;
      const userCount = users.length;
      const adminCount = users.filter(u => u.role === 'section_admin').length;
      
      showSuccessToast(
        `Loaded ${userCount} users (${adminCount} section admins) from ${sectionName || 'selected section'}`
      );

      // If no users were found, show a more helpful message
      if (users.length === 0) {
        console.log('No users found in section:', sectionId);
        console.log('This may be because:');
        console.log('1. No users have been assigned to this section');
        console.log('2. There was an error in the database query');
        console.log('3. The section_id in the users table does not match');
      }
    } catch (error: any) {
      console.error(`Error loading section users:`, error);
      showErrorToast(error.message || 'Failed to load section users');
      setSectionUsers([]);
    } finally {
      setSectionLoading(false);
    }
  };
  
  // Add a function to create test users
  const handleCreateTestUsers = async () => {
    if (!selectedSection || !selectedBatch || !selectedDepartment) {
      showErrorToast('Please select a department, batch, and section first');
      return;
    }

    setIsCreatingUsers(true);

    // Create test users using the admin service
    try {
      console.log('------ CREATING TEST USERS ------');
      console.log('Creating test users with:');
      console.log('- Department ID:', selectedDepartment);
      console.log('- Batch ID:', selectedBatch);
      console.log('- Section ID:', selectedSection);
      console.log('- Count:', testUserCount);
      
      // Call the service to create test users - the service returns { success, data, error }
      const result = await createTestUsersService(
        selectedDepartment, 
        selectedBatch, 
        selectedSection,
        testUserCount // Use the selected count from state
      );
      
      console.log('Test user creation result:', result);
      
      // Handle the response based on the returned object structure
      if (result && 'success' in result && result.success && result.data) {
        console.log('Test users created successfully:', result.data);
        showSuccessToast(`Created ${result.data.length} test users for this section`);
      } else {
        const errorMsg = (result && 'error' in result) ? result.error : 'Unknown error';
        console.error('Error returned from createTestUsers:', errorMsg);
        showErrorToast(`Failed to create test users: ${errorMsg}`);
      }
      
      // Refresh the section users list regardless of result to see any changes
      await loadSectionUsers(selectedSection);
      setShowTestUserForm(false);
    } catch (error: any) {
      console.error('Error creating test users:', error);
      showErrorToast(error.message || 'Failed to create test users');
    } finally {
      setIsCreatingUsers(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      if (selectedSection) {
        await loadSectionUsers(selectedSection);
      }
      showSuccessToast('User data refreshed successfully');
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };
  
  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Pagination controls
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Render pagination controls
  const renderPagination = () => {
    if (totalUsers <= usersPerPage) return null;
    
    return (
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, totalUsers)} of {totalUsers} users
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          {renderPageNumbers()}
          
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };
  
  // Generate page number buttons
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5; // Maximum page buttons to show
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // Adjust if at the end
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-md ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return <div className="flex items-center gap-1">{pageNumbers}</div>;
  };
  
  // Generate sort indicator for table headers
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline-block ml-1" /> :
      <ChevronDown className="h-4 w-4 inline-block ml-1" />;
  };
  
  const showPromoteConfirmation = (userId: string, userName: string) => {
    setConfirmAction({
      type: 'promote',
      userId,
      userName
    });
    setShowConfirmDialog(true);
  };
  
  const showDemoteConfirmation = (userId: string, userName: string) => {
    setConfirmAction({
      type: 'demote',
      userId,
      userName
    });
    setShowConfirmDialog(true);
  };
  
  const showDeleteConfirmation = (userId: string, userName: string) => {
    setConfirmAction({
      type: 'delete',
      userId,
      userName
    });
    setShowConfirmDialog(true);
  };
  
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    setShowConfirmDialog(false);
    setProcessingUser(confirmAction.userId);
    
    try {
      switch (confirmAction.type) {
        case 'promote':
          await onPromoteToSectionAdmin(confirmAction.userId);
          showSuccessToast(`${confirmAction.userName} promoted to section admin successfully`);
          break;
        case 'demote':
          await onDemoteUser(confirmAction.userId);
          showSuccessToast(`${confirmAction.userName} demoted successfully`);
          break;
        case 'delete':
          await onDeleteUser(confirmAction.userId);
          showSuccessToast(`${confirmAction.userName} deleted successfully`);
          break;
      }
      
      if (selectedSection) {
        await loadSectionUsers(selectedSection);
      }
    } catch (error: any) {
      showErrorToast(error.message || `Failed to ${confirmAction.type} user`);
    } finally {
      setProcessingUser(null);
      setConfirmAction(null);
    }
  };
  
  const handleCancelAction = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };
  
  const handlePromoteToSectionAdmin = async (userId: string) => {
    const user = sectionUsers.find(u => u.id === userId);
    if (user) {
      showPromoteConfirmation(userId, user.username || user.email);
    }
  };
  
  const handleDemoteUser = async (userId: string) => {
    const user = sectionUsers.find(u => u.id === userId);
    if (user) {
      showDemoteConfirmation(userId, user.username || user.email);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    const user = sectionUsers.find(u => u.id === userId);
    if (user) {
      showDeleteConfirmation(userId, user.username || user.email);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" /> 
            Section Admin Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage section administrators and users by department, batch, and section
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <a href="#help-section" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
            <Info className="h-4 w-4" />
            <span>Help</span>
          </a>
        </div>
      </div>
      
      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Department Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Department
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BookOpen className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedDepartment || ''}
              onChange={(e) => setSelectedDepartment(e.target.value || null)}
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Batch Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Batch
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Layers className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedBatch || ''}
              onChange={(e) => setSelectedBatch(e.target.value || null)}
              disabled={!selectedDepartment || filteredBatches.length === 0}
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
            >
              <option value="">
                {!selectedDepartment
                  ? 'Select department first'
                  : filteredBatches.length === 0
                  ? 'No batches in this department'
                  : 'Select Batch'}
              </option>
              {filteredBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Section Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Section
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedSection || ''}
              onChange={(e) => setSelectedSection(e.target.value || null)}
              disabled={!selectedBatch || filteredSections.length === 0}
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
            >
              <option value="">
                {!selectedBatch
                  ? 'Select batch first'
                  : filteredSections.length === 0
                  ? 'No sections in this batch'
                  : 'Select Section'}
              </option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Search Bar and User Management Controls */}
      {selectedSection && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm w-full md:w-auto">
            <div className="flex items-center justify-center px-3 py-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name, email, or student ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400 min-w-[200px] md:min-w-[300px]"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowTestUserForm(!showTestUserForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 w-full md:w-auto"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Test Users</span>
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50"
              title="Refresh users"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only md:not-sr-only">Refresh</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Test User Creator Form */}
      {selectedSection && showTestUserForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Test Users
          </h3>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="space-y-2 flex-grow">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Test Users
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={testUserCount}
                onChange={(e) => setTestUserCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                className="block w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Creates test users with random data. The last user will be a section admin.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCreateTestUsers}
                disabled={isCreatingUsers}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingUsers ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                <span>Create Users</span>
              </button>
              
              <button
                onClick={() => setShowTestUserForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User List */}
      {selectedSection ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-750">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name {renderSortIndicator('name')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email / Student ID {renderSortIndicator('email')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center">
                        Role {renderSortIndicator('role')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading || sectionLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No users match your search' : 'No users found in this section'}
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {user.username || 'Unnamed User'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>{user.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{user.studentId}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'section_admin'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500'
                              : user.role === 'super-admin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-500'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {user.role === 'section_admin'
                              ? 'Section Admin'
                              : user.role === 'super-admin'
                              ? 'Super Admin'
                              : user.role === 'admin'
                              ? 'Admin'
                              : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role !== 'section_admin' && user.role !== 'super-admin' && (
                              <button
                                onClick={() => handlePromoteToSectionAdmin(user.id)}
                                disabled={processingUser === user.id}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Promote to Section Admin"
                              >
                                <Shield className="h-5 w-5" />
                              </button>
                            )}
                            
                            {user.role === 'section_admin' && (
                              <button
                                onClick={() => handleDemoteUser(user.id)}
                                disabled={processingUser === user.id}
                                className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50 p-1 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                title="Demote to User"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            )}
                            
                            {user.role !== 'super-admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={processingUser === user.id}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete User"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {renderPagination()}
          </div>
          
          {/* Section Stats Summary */}
          {!loading && !sectionLoading && sortedAndFilteredUsers.length > 0 && (
            <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Total: {sortedAndFilteredUsers.length} users</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Section Admins: {sortedAndFilteredUsers.filter(u => u.role === 'section_admin').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span>
                  Department: {
                    departments.find(d => d.id === selectedDepartment)?.name || 'Unknown'
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Layers className="h-4 w-4 text-green-500" />
                <span>
                  Batch: {
                    batches.find(b => b.id === selectedBatch)?.name || 'Unknown'
                  }
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <Users className="h-24 w-24 text-blue-500 mb-4" />
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a Section to Manage Users
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Choose a department, batch, and section from the filters above to view and manage users and section administrators.
          </p>
          
          {/* Quick Selection Guide */}
          <div className="w-full max-w-md border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-blue-800 dark:text-blue-300 font-medium">
              Quick Selection Guide
            </div>
            <div className="p-4 text-sm text-left">
              <ol className="list-decimal list-inside space-y-2">
                <li className="text-gray-700 dark:text-gray-300">
                  Select a <span className="font-medium">Department</span> from the dropdown
                </li>
                <li className="text-gray-700 dark:text-gray-300">
                  Choose a <span className="font-medium">Batch</span> for the selected department
                </li>
                <li className="text-gray-700 dark:text-gray-300">
                  Select a <span className="font-medium">Section</span> to view and manage its users
                </li>
              </ol>
            </div>
          </div>
          
          {/* Troubleshooting Tips */}
          <div id="help-section" className="w-full max-w-md p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <h4 className="font-medium">Troubleshooting</h4>
            </div>
            <p className="mb-2">If you don't see users after selecting a section, you may need to:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Check that users are assigned to this section in the database</li>
              <li>Use the "Create Test Users" button after selecting a section</li>
              <li>Verify that department_id, batch_id, and section_id fields are not null in the users table</li>
              <li>Ensure the section_id values in users table match the section IDs exactly</li>
              <li>Refresh the page if data was recently changed</li>
            </ol>
            
            <div className="mt-4 pt-3 border-t border-yellow-200 dark:border-yellow-800/50">
              <h5 className="font-medium mb-1">Database Check:</h5>
              <p className="mb-2">If users still don't appear, check your database and ensure:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>The users table has records with the correct section_id</li>
                <li>User records have valid values for department_id and batch_id</li>
                <li>There are no permission issues preventing data access</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="mb-4">
              {confirmAction.type === 'promote' && (
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-500" />
                </div>
              )}
              {confirmAction.type === 'demote' && (
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-6 w-6 text-yellow-500" />
                </div>
              )}
              {confirmAction.type === 'delete' && (
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
              )}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                {confirmAction.type === 'promote' && 'Promote to Section Admin'}
                {confirmAction.type === 'demote' && 'Demote User'}
                {confirmAction.type === 'delete' && 'Delete User'}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
              {confirmAction.type === 'promote' && (
                <>Are you sure you want to promote <span className="font-semibold">{confirmAction.userName}</span> to section admin? 
                They will have administrative privileges over this section.</>
              )}
              {confirmAction.type === 'demote' && (
                <>Are you sure you want to demote <span className="font-semibold">{confirmAction.userName}</span>? 
                They will lose their section admin privileges.</>
              )}
              {confirmAction.type === 'delete' && (
                <>Are you sure you want to delete <span className="font-semibold">{confirmAction.userName}</span>? 
                This action cannot be undone.</>
              )}
            </p>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleCancelAction}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  confirmAction.type === 'promote'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : confirmAction.type === 'demote'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.type === 'promote' && 'Promote'}
                {confirmAction.type === 'demote' && 'Demote'}
                {confirmAction.type === 'delete' && 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add a CSS class for the fade-in animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
`;
document.head.appendChild(style); 