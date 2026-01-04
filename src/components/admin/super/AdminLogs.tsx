import React, { useState, useEffect } from 'react';
import { Search, CalendarClock, User, Filter, X, Download, Clock, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import type { AdminLog } from '../../../types/admin';

interface AdminLogsProps {
  logs: AdminLog[];
  loading: boolean;
}

export function AdminLogs({ logs, loading }: AdminLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AdminLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Available log actions for filtering
  const availableActions = ['all', 'create_admin', 'update_admin', 'delete_admin', 'reset_password', 'login', 'logout'];
  
  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...logs];
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.adminName.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term)
      );
    }
    
    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    // Apply date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // End of the day
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortDirection === 'desc' ? +dateB - +dateA : +dateA - +dateB;
    });
    
    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, dateRange, sortDirection]);
  
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setDateRange({ from: '', to: '' });
  };
  
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Admin', 'Action', 'Details', 'Timestamp', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${log.adminName}"`,
        `"${log.action}"`,
        `"${log.details.replace(/"/g, '""')}"`,
        `"${new Date(log.timestamp).toLocaleString()}"`,
        `"${log.ipAddress || ''}"`,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `admin-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create_admin':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'update_admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'delete_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'reset_password':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
      case 'login':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'logout':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-5">
      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            Admin Activity Logs
          </h2>
          
          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white appearance-none"
            >
              {availableActions.map(action => (
                <option key={action} value={action}>
                  {action === 'all' ? 'All Actions' : formatActionName(action)}
                </option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Date Range - From */}
          <div className="relative">
            <input
              type="date"
              name="from"
              value={dateRange.from}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="From date"
            />
            <CalendarClock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Date Range - To */}
          <div className="relative">
            <input
              type="date"
              name="to"
              value={dateRange.to}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="To date"
            />
            <CalendarClock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Active Filters & Sort Control */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Active filters */}
            {(searchTerm || actionFilter !== 'all' || dateRange.from || dateRange.to) && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Search: {searchTerm}
                    <X size={14} className="ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </span>
                )}
                
                {actionFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Action: {formatActionName(actionFilter)}
                    <X size={14} className="ml-1 cursor-pointer" onClick={() => setActionFilter('all')} />
                  </span>
                )}
                
                {dateRange.from && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    From: {dateRange.from}
                    <X size={14} className="ml-1 cursor-pointer" onClick={() => setDateRange(prev => ({ ...prev, from: '' }))} />
                  </span>
                )}
                
                {dateRange.to && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    To: {dateRange.to}
                    <X size={14} className="ml-1 cursor-pointer" onClick={() => setDateRange(prev => ({ ...prev, to: '' }))} />
                  </span>
                )}
                
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
          
          {/* Sort control */}
          <button
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Clock className="h-4 w-4 mr-1" />
            {sortDirection === 'desc' ? (
              <>Newest first <ArrowDownAZ className="h-3 w-3 ml-1" /></>
            ) : (
              <>Oldest first <ArrowUpAZ className="h-3 w-3 ml-1" /></>
            )}
          </button>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {logs.length === 0 
              ? 'No activity logs found in the system.' 
              : 'No logs match your current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-750 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{log.adminName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.adminId.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {log.details}
                      </div>
                      {log.resource && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Resource: {log.resource} {log.resourceId && `#${log.resourceId.substring(0, 8)}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.ipAddress || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Results Summary */}
      {!loading && logs.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      )}
    </div>
  );
} 