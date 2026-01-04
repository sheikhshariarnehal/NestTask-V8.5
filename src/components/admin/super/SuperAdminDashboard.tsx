import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, BarChart2, FileText, Shield, LogOut, ChevronLeft, 
  Clock, CheckCircle, AlertCircle, ArrowUpRight, User, Settings,
  Calendar, Search, Bell, Moon, Sun, Key, UserPlus, Filter, Eye,
  RefreshCw, Bug
} from 'lucide-react';
import { AdminManagement } from './AdminManagement';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminLogs } from './AdminLogs';
import { SecuritySettings } from './SecuritySettings';
import { SectionAdminManagement } from './SectionAdminManagement';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { AdminUser, AdminLog, AdminStats } from '../../../types/admin';
import { Department, Batch, Section } from '../../../types/auth';
import { testUserFetch } from '../../../services/test.service';
import { supabase } from '../../../lib/supabase';
import { getDepartments, getBatchesByDepartment, getSectionsByBatch } from '../../../services/department.service';

// SideNavLink Component
interface SideNavLinkProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  isCollapsed?: boolean;
}

const SideNavLink: React.FC<SideNavLinkProps> = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  badge,
  isCollapsed = false
}) => {
  if (isCollapsed) {
    return (
      <button
        onClick={onClick}
        className={`
          w-full flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 relative will-change-transform
          ${isActive 
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        title={label}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
        
        {badge !== undefined && (
          <span className={`
            absolute top-0 right-0.5 px-1 py-0.5 min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-medium rounded-full
            ${isActive 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
          `}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between rounded-lg py-2 px-3 transition-all duration-200 will-change-transform
        ${isActive 
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      
      {badge !== undefined && (
        <span className={`
          px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center text-xs font-medium rounded-full
          ${isActive 
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }
        `}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('admins');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState({
    admins: true,
    stats: true,
    logs: true,
    departments: true
  });
  const [testLoading, setTestLoading] = useState(false);
  const [userRoleDebug, setUserRoleDebug] = useState<string | null>(null);
  
  // State for departments, batches, and sections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const { isDark, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();

  const { 
    admins, 
    loading: adminsLoading, 
    error: adminsError,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    resetPassword,
    promoteToAdmin,
    promoteToSectionAdmin,
    demoteUser,
    getSectionUsers,
    getSections,
    refreshAdmins
  } = useAdminUsers();

  // Replace the enhanced recovery functionality with a simple initialization effect
  useEffect(() => {
    // Mark super admin status for proper cache handling
    localStorage.setItem('is_super_admin', 'true');
    sessionStorage.setItem('is_super_admin', 'true');
    
    // Force immediate data load on mount
    refreshAdmins();
    
    // Clear any reload-related flags
    sessionStorage.removeItem('super_admin_reloading');
    sessionStorage.removeItem('super_admin_reload_count');
    sessionStorage.removeItem('recovering_super_admin');
    
    // Handle path-specific tab selection if needed
    if (window.location.pathname.includes('/section-admins')) {
      setActiveTab('section-admins');
    } else if (window.location.pathname.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (window.location.pathname.includes('/logs')) {
      setActiveTab('logs');
    } else if (window.location.pathname.includes('/security')) {
      setActiveTab('security');
    }
    
  }, [refreshAdmins, setActiveTab]);

  // Check for mobile view and update when window resizes
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileView(isMobile);
      if (!isMobile && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, [isMobileMenuOpen]);

  // Update time and greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      const hours = now.getHours();
      if (hours < 12) {
        setGreeting('Good Morning');
      } else if (hours < 18) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Load departments, batches, and sections
  useEffect(() => {
    const fetchDepartmentsData = async () => {
      setLoading(prev => ({ ...prev, departments: true }));
      try {
        // Fetch departments
        const depts = await getDepartments();
        setDepartments(depts);
        
        // Fetch all batches for all departments
        const batchPromises = depts.map(dept => getBatchesByDepartment(dept.id));
        const batchesArrays = await Promise.all(batchPromises);
        const allBatches = batchesArrays.flat();
        setBatches(allBatches);
        
        // Fetch all sections for all batches
        const sectionPromises = allBatches.map(batch => getSectionsByBatch(batch.id));
        const sectionsArrays = await Promise.all(sectionPromises);
        const allSections = sectionsArrays.flat();
        setSections(allSections);
      } catch (error) {
        console.error('Error fetching departments data:', error);
      } finally {
        setLoading(prev => ({ ...prev, departments: false }));
      }
    };
    
    fetchDepartmentsData();
  }, []);

  // Load admin stats
  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(prev => ({ ...prev, stats: true }));
      
      try {
        // This would be a real API call in production
        // For now, we'll use mock data based on the actual admins
        const mockStats: AdminStats = {
          totalAdmins: admins.length,
          activeAdmins: admins.filter((a: AdminUser) => a.isActive).length,
          disabledAdmins: admins.filter((a: AdminUser) => !a.isActive).length,
          permissionChanges: Math.floor(Math.random() * 15) + 5, // Random number between 5-20
          departmentDistribution: generateDepartmentDistribution(admins),
          roleDistribution: generateRoleDistribution(admins),
          monthlyActivity: generateMonthlyActivity(),
          permissionUsage: generatePermissionUsage(admins),
          recentLogins: generateRecentLogins(admins),
          mostActiveAdmins: generateMostActiveAdmins(admins),
          // Create a record for AdminAnalytics department chart
          adminsByDepartment: generateAdminsByDepartment(admins)
        };
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setAdminStats(mockStats);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(prev => ({ ...prev, stats: false }));
      }
    };
    
    if (!adminsLoading && admins.length > 0) {
      fetchAdminStats();
    }
  }, [admins, adminsLoading]);

  // Load admin logs
  useEffect(() => {
    const fetchAdminLogs = async () => {
      setLoading(prev => ({ ...prev, logs: true }));
      
      try {
        // This would be a real API call in production
        // For now, we'll use mock data based on the actual admins
        const mockLogs = generateAdminLogs(admins);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setAdminLogs(mockLogs);
      } catch (error) {
        console.error('Error fetching admin logs:', error);
      } finally {
        setLoading(prev => ({ ...prev, logs: false }));
      }
    };
    
    if (!adminsLoading && admins.length > 0) {
      fetchAdminLogs();
    }
  }, [admins, adminsLoading]);

  // Update loading state when admins loading state changes
  useEffect(() => {
    setLoading(prev => ({ ...prev, admins: adminsLoading }));
  }, [adminsLoading]);

  // Helper functions to generate mock data
  function generateDepartmentDistribution(admins: AdminUser[]) {
    const deptMap = admins.reduce((acc, admin) => {
      const dept = admin.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(deptMap).map(([department, count]) => ({ 
      department, 
      count 
    }));
  }

  function generateRoleDistribution(admins: AdminUser[]) {
    const roleMap = admins.reduce((acc, admin) => {
      const role = admin.role || 'Standard';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(roleMap).map(([role, count]) => ({ 
      role, 
      count 
    }));
  }

  function generateMonthlyActivity() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    // Create a trend-based pattern (increasing activity over time with small variations)
    return months.map((month, index) => {
      // Create a base value that tends to grow over months
      const baseLogins = 10 + Math.floor(index * 3.5);
      const baseActions = 40 + Math.floor(index * 7);
      
      // Add randomness (±20%)
      const randomFactorLogins = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
      const randomFactorActions = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
      
      // Current month has more activity, past months have actual values
      const monthIndex = months.indexOf(month);
      const isCurrentMonth = monthIndex === currentMonth;
      const isPastMonth = monthIndex < currentMonth;
      
      let logins = Math.floor(baseLogins * randomFactorLogins);
      let actions = Math.floor(baseActions * randomFactorActions);
      
      // Current month has approximately 2/3 of expected activity (since month isn't over)
      if (isCurrentMonth) {
        logins = Math.floor(logins * 0.7);
        actions = Math.floor(actions * 0.7);
      }
      
      // Future months have no data yet
      if (!isPastMonth && !isCurrentMonth) {
        logins = 0;
        actions = 0;
      }
      
      return {
        month,
        logins,
        actions
      };
    });
  }

  function generatePermissionUsage(admins: AdminUser[]) {
    // Define common permissions to track
    const permissions = [
      'User Management', 
      'Course Management', 
      'Announcement Management', 
      'Teacher Management', 
      'Routine Management', 
      'Task Management', 
      'Report Viewing', 
      'Settings Management'
    ];
    
    // Map the permissions to actual database permissions structure
    const permissionMapping: Record<string, string[]> = {
      'User Management': ['viewUsers', 'createUsers', 'editUsers', 'deleteUsers'],
      'Course Management': ['viewCourses', 'createCourses', 'editCourses', 'deleteCourses'],
      'Announcement Management': ['viewAnnouncements', 'createAnnouncements', 'editAnnouncements'],
      'Teacher Management': ['viewTeachers', 'assignTeachers', 'editTeachers'],
      'Routine Management': ['viewRoutine', 'createRoutine', 'editRoutine'],
      'Task Management': ['viewTasks', 'createTasks', 'editTasks', 'deleteTasks', 'assignTasks'],
      'Report Viewing': ['viewReports', 'exportData', 'analyzeData'],
      'Settings Management': ['viewSettings', 'editSettings', 'manageSecuritySettings']
    };
    
    // Calculate usage for each permission category
    return permissions.map(permission => {
      // Get the actual permission keys for this category
      const permissionKeys = permissionMapping[permission] || [];
      
      // Count how many admins have at least one of the permissions in this category
      let count = 0;
      if (permissionKeys.length > 0) {
        count = admins.filter(admin => {
          if (!admin.permissions) return false;
          return permissionKeys.some(key => admin.permissions?.includes(key));
        }).length;
      } else {
        // Fallback for custom permissions - assign a weighted random value based on admin count
        count = Math.floor((Math.random() * 0.7 + 0.3) * admins.length);
      }
      
      return {
        permission,
        count
      };
    });
  }

  function generateRecentLogins(admins: AdminUser[]) {
    // Get only active admins for login simulation
    const activeAdmins = admins.filter(admin => admin.isActive);
    if (activeAdmins.length === 0) return [];
    
    // Create login entries with realistic timestamps
    const loginEntries = [];
    const now = new Date();
    
    // Generate 10 recent login entries
    for (let i = 0; i < Math.min(10, activeAdmins.length * 2); i++) {
      // Select a random admin from active admins
      const admin = activeAdmins[Math.floor(Math.random() * activeAdmins.length)];
      
      // Create a random timestamp within the last 48 hours
      const minutesAgo = Math.floor(Math.random() * 48 * 60); // Up to 48 hours ago
      const loginTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      // Generate realistic IP address
      const ip1 = Math.floor(Math.random() * 255);
      const ip2 = Math.floor(Math.random() * 255);
      const ip3 = Math.floor(Math.random() * 255);
      const ip4 = Math.floor(Math.random() * 255);
      const ipAddress = `${ip1}.${ip2}.${ip3}.${ip4}`;
      
      loginEntries.push({
        id: `login_${i}_${admin.id.substring(0, 5)}`,
        adminId: admin.id,
        adminName: admin.username,
        timestamp: loginTime.toISOString(),
        ipAddress
      });
    }
    
    // Sort by timestamp (most recent first) and return top 5
    return loginEntries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }

  function generateMostActiveAdmins(admins: AdminUser[]) {
    // Create a weighted activity score for each admin
    // Factors: active status (active admins have more actions), time since last login
    const activeAdmins = admins.map(admin => {
      // Base activity count - random value between 10-50
      let baseActivityCount = Math.floor(Math.random() * 40) + 10;
      
      // Increase count for active admins
      if (admin.isActive) {
        baseActivityCount *= 1.5;
      }
      
      // Adjust based on last login (more recent = more activity)
      if (admin.lastLogin) {
        const lastLoginDate = new Date(admin.lastLogin);
        const now = new Date();
        const daysSinceLogin = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // More recent logins mean more activity
        if (daysSinceLogin < 7) {
          baseActivityCount *= 1.3;
        } else if (daysSinceLogin > 30) {
          baseActivityCount *= 0.7;
        }
      }
      
      return {
        adminId: admin.id,
        adminName: admin.username,
        actionsCount: Math.floor(baseActivityCount)
      };
    });
    
    // Sort by activity count (highest first) and return top 5
    return activeAdmins
      .sort((a, b) => b.actionsCount - a.actionsCount)
      .slice(0, 5);
  }

  function generateAdminLogs(admins: AdminUser[]): AdminLog[] {
    const actions = [
      'logged_in',
      'logged_out',
      'created_user',
      'updated_user',
      'deleted_user',
      'reset_password',
      'changed_settings',
      'exported_data',
      'viewed_report',
    ];
    
    const logs: AdminLog[] = [];
    
    // Generate 50 random logs
    for (let i = 0; i < 50; i++) {
      const admin = admins[Math.floor(Math.random() * admins.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      let details = {};
      
      if (action === 'created_user' || action === 'updated_user' || action === 'deleted_user') {
        details = { 
          userId: `user_${Math.floor(Math.random() * 1000)}`, 
          username: `user${Math.floor(Math.random() * 1000)}` 
        };
      } else if (action === 'changed_settings') {
        details = { 
          setting: 'security_policy', 
          oldValue: 'moderate', 
          newValue: 'strict' 
        };
      }
      
      logs.push({
        id: `log_${i}`,
        adminId: admin.id,
        adminName: admin.username,
        action,
        timestamp: date.toISOString(),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        details
      });
    }
    
    // Sort by timestamp (most recent first)
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Generate a record of departments for AdminAnalytics 
  function generateAdminsByDepartment(admins: AdminUser[]) {
    const deptMap = admins.reduce((acc, admin) => {
      const dept = admin.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return deptMap;
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...'); // This will show in console when logout is attempted
      
      // Call the logout function from useAuth
      await logout();
      
      console.log('Logout successful, redirecting...');
      
      // Force a redirect to login page if needed
      setTimeout(() => {
        if (window.location.pathname.includes('super-admin')) {
          console.log('Still on super admin page after logout, forcing redirect...');
          window.location.href = '/';
        }
      }, 1000);
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Logout failed. Please try again.');
    }
  };

  // Function to test user fetch directly
  const handleTestFetch = async () => {
    try {
      setTestLoading(true);
      console.log("Starting direct test fetch...");
      const result = await testUserFetch();
      console.log("Test fetch result:", result);
    } catch (error) {
      console.error("Test fetch error:", error);
    } finally {
      setTestLoading(false);
    }
  };
  
  // Debug logging for admin data
  useEffect(() => {
    console.log("SuperAdminDashboard - admins:", admins);
    console.log("SuperAdminDashboard - adminsLoading:", adminsLoading);
    console.log("SuperAdminDashboard - adminsError:", adminsError);
  }, [admins, adminsLoading, adminsError]);

  // Add debug function to check user role
  const checkUserRole = async () => {
    try {
      console.log("Checking current user role...");
      
      // Get user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User from auth:", user);
      
      // Get role from metadata
      const roleFromMetadata = user?.user_metadata?.role;
      console.log("Role from metadata:", roleFromMetadata);
      
      // Get user from database as well
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          console.log("User role from database:", data.role);
          setUserRoleDebug(`Auth role: ${roleFromMetadata || 'not set'}, DB role: ${data.role || 'not set'}`);
        } else {
          console.error("Error fetching user from database:", error);
          setUserRoleDebug(`Auth role: ${roleFromMetadata || 'not set'}, DB role: Error`);
        }
      } else {
        setUserRoleDebug("No authenticated user found");
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setUserRoleDebug("Error checking role");
    }
  };

  const navigation = [
    {
      id: 'admins',
      label: 'Admins',
      icon: UserPlus,
      badge: admins.length
    },
    {
      id: 'section-admins',
      label: 'Section Admins',
      icon: Users
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart2
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: FileText,
      badge: adminLogs.length
    },
    {
      id: 'security',
      label: 'Security',
      icon: Key
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isMobileView 
            ? isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            : isSidebarCollapsed ? 'w-16' : 'w-64'
        } ${isMobileView ? 'shadow-xl' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!isSidebarCollapsed && (
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Super Admin
            </h2>
          )}
          <button 
            onClick={isMobileView ? toggleMobileMenu : toggleSidebar}
            className={`p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
          >
            <ChevronLeft className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navigation.map((item) => (
            <SideNavLink
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
          </nav>
        
        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
            className={`
              flex items-center w-full gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-lg
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
              ${isSidebarCollapsed ? 'justify-center' : ''}
            `}
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Logout</span>}
                </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileView && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-[5]"
          onClick={toggleMobileMenu}
        />
      )}
      
      {/* Main Content */}
      <main 
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isMobileView 
            ? 'pl-0' 
            : isSidebarCollapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu button */}
            {isMobileView && (
              <button
                onClick={toggleMobileMenu}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft className={`h-5 w-5 ${isMobileMenuOpen ? '' : 'rotate-180'}`} />
              </button>
            )}
            
            {/* Time and greeting */}
            <div className={`flex items-center ${isMobileView ? 'mx-auto' : ''}`}>
              <div className="text-sm text-gray-500 dark:text-gray-400">{currentTime}</div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mx-2"></div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{greeting}, Admin</div>
            </div>
            
            {/* Right actions */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle */}
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 dashboard-content">
          {/* Main content based on active tab */}
            {activeTab === 'admins' && (
                <AdminManagement
                  admins={admins}
              loading={adminsLoading}
                  error={adminsError}
                  onCreateAdmin={createAdmin}
                  onUpdateAdmin={updateAdmin}
                  onDeleteAdmin={deleteAdmin}
                  onResetPassword={resetPassword}
                  onPromoteToAdmin={promoteToAdmin}
                  onRefresh={refreshAdmins}
                />
          )}
          
          {activeTab === 'section-admins' && (
            <SectionAdminManagement
              admins={admins}
              loading={adminsLoading || loading.departments}
              error={adminsError}
              onPromoteToSectionAdmin={promoteToSectionAdmin}
              onDemoteUser={demoteUser}
              onDeleteUser={deleteAdmin}
              onGetSectionUsers={getSectionUsers}
              onGetSections={getSections}
              onRefresh={refreshAdmins}
              departments={departments}
              batches={batches}
              sections={sections}
            />
            )}
            
            {activeTab === 'analytics' && (
              <AdminAnalytics 
                stats={adminStats}
                loading={loading.stats} 
              />
            )}
            
            {activeTab === 'logs' && (
              <AdminLogs 
                logs={adminLogs}
                loading={loading.logs} 
              />
            )}
            
            {activeTab === 'security' && (
            <SecuritySettings
              admins={admins}
              onResetPassword={resetPassword}
            />
            )}
        </div>
      </main>
    </div>
  );
} 