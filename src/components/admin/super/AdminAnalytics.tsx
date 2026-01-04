import React, { useState, useCallback, useEffect } from 'react';
import { 
  BarChart, PieChart, Users, UserCheck, UserX, RefreshCw, 
  Clock, Activity, Shield, Building, Download, Filter,
  Calendar, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp
} from 'lucide-react';
import type { AdminStats } from '../../../types/admin';

interface AdminAnalyticsProps {
  stats: AdminStats | null;
  loading: boolean;
}

export function AdminAnalytics({ stats, loading }: AdminAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stateTrends, setStateTrends] = useState({
    admins: 0,
    active: 0,
    disabled: 0,
    permissions: 0
  });
  
  // Initialize department options from stats
  const departmentOptions = stats?.departmentDistribution 
    ? ['all', ...stats.departmentDistribution.map(d => d.department)]
    : ['all'];
  
  // Calculate trends (would normally come from API)
  useEffect(() => {
    if (stats) {
      setStateTrends({
        admins: Math.floor(Math.random() * 20) - 10, // -10 to +10
        active: Math.floor(Math.random() * 15), // 0 to 15
        disabled: Math.floor(Math.random() * 10) - 7, // -7 to +3
        permissions: Math.floor(Math.random() * 30) - 10 // -10 to +20
      });
    }
  }, [stats]);
  
  // Simulate data refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // In a real implementation, this would trigger a data fetch
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);
  
  // Helper for department visualization with enhanced design
  const renderDepartmentDistribution = useCallback(() => {
    const departments = stats?.departmentDistribution || [];
    const maxValue = Math.max(...departments.map(d => d.count), 1);
    
    return (
      <div className="space-y-3">
        {departments.map((dept) => (
          <div key={dept.department} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">
                {dept.department}
              </span>
              <div className="flex items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{dept.count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">admins</span>
              </div>
            </div>
            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
              <div 
                style={{ width: `${(dept.count / maxValue) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-500"
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [stats?.departmentDistribution]);
  
  // Enhanced circular chart for active admin visualization
  const renderActiveAdminsChart = useCallback(() => {
    const totalAdmins = stats?.totalAdmins || 0;
    const activeAdmins = stats?.activeAdmins || 0;
    const disabledAdmins = stats?.disabledAdmins || 0;
    
    const activePercentage = totalAdmins > 0 ? Math.round((activeAdmins / totalAdmins) * 100) : 0;
    const circumference = 2 * Math.PI * 16; // circle circumference (r=16)
    const dashArray = (activePercentage / 100) * circumference;
    
    return (
      <div className="flex items-center justify-between">
        <div className="relative h-32 w-32">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            {/* Background circle */}
            <circle
              cx="18" cy="18" r="16"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="3.6"
              className="dark:stroke-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="18" cy="18" r="16"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3.6"
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              className="dark:stroke-blue-500 transition-all duration-1000 ease-in-out"
              transform="rotate(-90 18 18)"
            />
            {/* Center text */}
            <text 
              x="18" 
              y="18" 
              dy=".35em" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              fill="#4B5563" 
              className="dark:fill-white text-3xl font-bold"
            >
              {activePercentage}%
            </text>
          </svg>
        </div>
        <div className="flex-1 pl-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-500 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Active</span>
              </div>
              <div className="flex items-center mt-1">
                <p className="text-xl font-bold text-gray-800 dark:text-white">{activeAdmins}</p>
                {stateTrends.active > 0 && (
                  <div className="flex items-center ml-2 text-xs text-green-500">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{stateTrends.active}%</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Disabled</span>
              </div>
              <div className="flex items-center mt-1">
                <p className="text-xl font-bold text-gray-800 dark:text-white">{disabledAdmins}</p>
                {stateTrends.disabled < 0 && (
                  <div className="flex items-center ml-2 text-xs text-red-500">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>{Math.abs(stateTrends.disabled)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [stats?.totalAdmins, stats?.activeAdmins, stats?.disabledAdmins, stateTrends]);
  
  // Enhanced permission usage visualization
  const renderPermissionUsage = useCallback(() => {
    const data = stats?.permissionUsage || [];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item) => {
          const percentage = Math.min(100, Math.round((item.count / (stats?.totalAdmins || 1)) * 100));
          return (
            <div key={item.permission} className="flex flex-col">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[80%]">
                  {item.permission}
                </span>
                <div className="flex space-x-1">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{percentage}%</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({item.count})</span>
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  style={{ width: `${percentage}%` }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full transition-all duration-500 ${
                    percentage > 75 ? 'bg-green-500 dark:bg-green-600' : 
                    percentage > 50 ? 'bg-blue-500 dark:bg-blue-600' : 
                    percentage > 25 ? 'bg-amber-500 dark:bg-amber-600' :
                    'bg-red-500 dark:bg-red-600'
                  }`}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [stats?.permissionUsage, stats?.totalAdmins]);
  
  // Enhanced monthly activity visualization with tooltips and better bars
  const renderMonthlyActivity = useCallback(() => {
    if (!stats?.monthlyActivity || stats.monthlyActivity.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          No activity data available
        </div>
      );
    }
    
    const data = stats.monthlyActivity;
    const maxLogins = Math.max(...data.map(d => d.logins));
    const maxActions = Math.max(...data.map(d => d.actions));
    
    return (
      <div className="pt-5">
        <div className="flex items-end justify-between space-x-1 h-[180px]">
          {data.map((item) => (
            <div key={item.month} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex justify-center">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none z-10 whitespace-nowrap">
                  <div className="font-medium">{item.month}</div>
                  <div className="flex justify-between gap-2">
                    <span>Logins:</span>
                    <span>{item.logins}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Actions:</span>
                    <span>{item.actions}</span>
                  </div>
                </div>
                
                {/* Bars */}
                <div className="flex space-x-1">
                  <div 
                    className="w-3 bg-blue-500 dark:bg-blue-600 rounded-t hover:bg-blue-600 dark:hover:bg-blue-700 transition-all cursor-pointer group-hover:opacity-90"
                    style={{ height: `${(item.logins / maxLogins) * 100}%` }}
                  ></div>
                  <div 
                    className="w-3 bg-purple-500 dark:bg-purple-600 rounded-t hover:bg-purple-600 dark:hover:bg-purple-700 transition-all cursor-pointer group-hover:opacity-90"
                    style={{ height: `${(item.actions / maxActions) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.month.substring(0, 3)}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center mt-4 space-x-8">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded bg-blue-500 dark:bg-blue-600 mr-2"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Logins</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded bg-purple-500 dark:bg-purple-600 mr-2"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Actions</span>
          </div>
        </div>
      </div>
    );
  }, [stats?.monthlyActivity]);
  
  // Enhanced most active admins list
  const renderActiveAdminsList = useCallback(() => {
    if (!stats?.mostActiveAdmins || stats.mostActiveAdmins.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No activity data available
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {stats.mostActiveAdmins.map((admin, index) => (
          <div key={admin.adminId} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-3 font-semibold">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{admin.adminName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{admin.adminId.substring(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
              <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mr-1.5" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{admin.actionsCount}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [stats?.mostActiveAdmins]);
  
  // Enhanced recent logins list
  const renderRecentLoginsList = useCallback(() => {
    if (!stats?.recentLogins || stats.recentLogins.length === 0) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No recent login data available
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {stats.recentLogins.map((login) => {
          const loginDate = new Date(login.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - loginDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          
          let timeAgo;
          if (diffDays > 0) {
            timeAgo = `${diffDays}d ago`;
          } else if (diffHours > 0) {
            timeAgo = `${diffHours}h ago`;
          } else {
            timeAgo = `${diffMinutes}m ago`;
          }
          
          return (
            <div key={login.adminId} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{login.adminName}</p>
                  <div className="flex items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{login.ipAddress}</span>
                    <span className="mx-1.5 h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                    <span className="text-gray-400 dark:text-gray-500">{timeAgo}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {loginDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [stats?.recentLogins]);

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              Admin Analytics Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Comprehensive analytics for monitoring admin activity and usage patterns.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Time range selector */}
            <div className="relative">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-650 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
        
        {/* Filter panel - conditionally rendered */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <select 
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept === 'all' ? 'All Departments' : dept}</option>
                  ))}
                </select>
              </div>
              
              {/* Additional filters can be added here */}
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards - Enhanced with trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Admins</p>
                    <div className="flex items-center mt-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalAdmins || 0}</h3>
                      <div className={`flex items-center ml-2 text-xs ${
                        stateTrends.admins > 0 ? 'text-green-500' : 
                        stateTrends.admins < 0 ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {stateTrends.admins > 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        ) : stateTrends.admins < 0 ? (
                          <ArrowDownRight className="h-3 w-3 mr-0.5" />
                        ) : null}
                        <span>{Math.abs(stateTrends.admins)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Admins</p>
                    <div className="flex items-center mt-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeAdmins || 0}</h3>
                      <div className="flex items-center ml-2 text-xs text-green-500">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        <span>{stateTrends.active}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Disabled Admins</p>
                    <div className="flex items-center mt-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.disabledAdmins || 0}</h3>
                      {stateTrends.disabled !== 0 && (
                        <div className={`flex items-center ml-2 text-xs ${stateTrends.disabled < 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stateTrends.disabled < 0 ? (
                            <ArrowDownRight className="h-3 w-3 mr-0.5" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          )}
                          <span>{Math.abs(stateTrends.disabled)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <UserX className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Permission Changes</p>
                    <div className="flex items-center mt-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.permissionChanges || 0}</h3>
                      <div className={`flex items-center ml-2 text-xs ${
                        stateTrends.permissions > 0 ? 'text-amber-500' : 
                        stateTrends.permissions < 0 ? 'text-blue-500' : 'text-gray-500'
                      }`}>
                        {stateTrends.permissions !== 0 && (
                          <>
                            {stateTrends.permissions > 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-0.5" />
                            )}
                            <span>{Math.abs(stateTrends.permissions)}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts and Analytics - Enhanced designs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Active vs Disabled Admins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active vs Disabled Admins</h3>
                  <PieChart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderActiveAdminsChart()}
              </div>
              
              {/* Department Distribution */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Admin Distribution by Department</h3>
                  <Building className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderDepartmentDistribution()}
              </div>
              
              {/* Monthly Activity */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Admin Activity</h3>
                  <BarChart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderMonthlyActivity()}
              </div>
              
              {/* Permission Usage */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Permission Usage Patterns</h3>
                  <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderPermissionUsage()}
              </div>
            </div>
            
            {/* Lists - Enhanced designs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Active Admins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Most Active Admins</h3>
                  <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderActiveAdminsList()}
                
                {stats?.mostActiveAdmins && stats.mostActiveAdmins.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium flex items-center justify-center w-full">
                      <Download className="h-4 w-4 mr-1.5" /> 
                      Export Activity Report
                    </button>
                  </div>
                )}
              </div>
              
              {/* Recent Logins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Admin Logins</h3>
                  <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderRecentLoginsList()}
                
                {stats?.recentLogins && stats.recentLogins.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium flex items-center justify-center w-full">
                      <Download className="h-4 w-4 mr-1.5" /> 
                      Export Login Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-6">
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
        <span className="flex items-center">
          {isRefreshing ? 'Refreshing data...' : `Last updated: ${new Date().toLocaleString()}`}
        </span>
      </div>
    </div>
  );
} 