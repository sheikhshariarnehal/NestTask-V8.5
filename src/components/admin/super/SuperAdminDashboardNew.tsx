import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut, Bell } from 'lucide-react';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { OverviewDashboard } from './OverviewDashboard';
import { AdminManagementNew } from './AdminManagementNew';
import { 
  SectionAdminManagementWrapper,
  AdminAnalyticsWrapper,
  AdminLogsWrapper,
  SecuritySettingsWrapper
} from './DashboardWrappers';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminUsers } from '../../../hooks/useAdminUsers';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { isDark, toggle: toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { refreshAdmins } = useAdminUsers();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  // Sync activeTab with URL path
  useEffect(() => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      '/superadmin/dashboard': 'overview',
      '/superadmin/overview': 'overview',
      '/superadmin/admins': 'admins',
      '/superadmin/sectionadmins': 'section-admins',
      '/superadmin/analytics': 'analytics',
      '/superadmin/logs': 'logs',
      '/superadmin/security': 'security',
    };
    
    const tab = pathMap[path] || 'overview';
    setActiveTab(tab);
  }, [location.pathname]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const pathMap: Record<string, string> = {
      'overview': '/superadmin/dashboard',
      'admins': '/superadmin/admins',
      'section-admins': '/superadmin/sectionadmins',
      'analytics': '/superadmin/analytics',
      'logs': '/superadmin/logs',
      'security': '/superadmin/security',
    };
    navigate(pathMap[tab] || '/superadmin/dashboard', { replace: true });
  };

  // Check for mobile view
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

  // Initialize data
  useEffect(() => {
    localStorage.setItem('is_super_admin', 'true');
    sessionStorage.setItem('is_super_admin', 'true');
    refreshAdmins();
  }, [refreshAdmins]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'admins':
        return <AdminManagementNew />;
      case 'section-admins':
        return <SectionAdminManagementWrapper />;
      case 'analytics':
        return <AdminAnalyticsWrapper />;
      case 'logs':
        return <AdminLogsWrapper />;
      case 'security':
        return <SecuritySettingsWrapper />;
      default:
        return <OverviewDashboard />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      overview: 'Dashboard Overview',
      admins: 'Admin Management',
      'section-admins': 'Section Admin Management',
      analytics: 'Analytics & Reports',
      logs: 'System Logs',
      security: 'Security Settings',
    };
    return titles[activeTab] || 'Dashboard';
  };

  const getPageDescription = () => {
    const descriptions: Record<string, string> = {
      overview: 'Monitor your system at a glance',
      admins: 'Manage system administrators and their permissions',
      'section-admins': 'Manage section-level administrators',
      analytics: 'View detailed analytics and performance metrics',
      logs: 'Monitor system activities and audit logs',
      security: 'Configure security settings and permissions',
    };
    return descriptions[activeTab] || '';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <SuperAdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobile={isMobileView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Page Title */}
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  {getPageDescription()}
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative">
                <Bell className="w-5 h-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                >
                  3
                </Badge>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* User Menu */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'SA'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || 'Super Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
