import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Search, Download, Send, Bell, Filter, X } from 'lucide-react';
import { FCMStats } from './FCMStats';
import { FCMTokenList } from './FCMTokenList';
import { TestNotificationModal } from './TestNotificationModal';
import { 
  fetchSectionFCMTokens, 
  getSectionFCMStatistics, 
  sendTestNotification,
  exportTokensToCSV 
} from '../../../services/fcm-admin.service';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';
import type { FCMTokenWithUser, FCMStatistics, TestNotificationPayload } from '../../../types/fcm';

interface FCMTokenManagerProps {
  sectionId: string;
  sectionName: string;
  userId: string;
}

export function FCMTokenManager({ sectionId, sectionName, userId }: FCMTokenManagerProps) {
  const [tokens, setTokens] = useState<FCMTokenWithUser[]>([]);
  const [stats, setStats] = useState<FCMStatistics>({
    totalTokens: 0,
    activeTokens: 0,
    inactiveTokens: 0,
    androidTokens: 0,
    iosTokens: 0,
    webTokens: 0,
    totalUsers: 0,
    usersWithTokens: 0,
    coveragePercentage: 0,
    lastRegistration: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (sectionId && userId) {
      loadData();
    }
  }, [sectionId, userId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tokensData, statsData] = await Promise.all([
        fetchSectionFCMTokens(sectionId, userId),
        getSectionFCMStatistics(sectionId, userId),
      ]);
      setTokens(tokensData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading FCM data:', error);
      showErrorToast(error.message || 'Failed to load FCM tokens');
    } finally {
      setLoading(false);
    }
  }, [sectionId, userId]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
      showSuccessToast('FCM tokens refreshed successfully');
    } catch (error: any) {
      showErrorToast('Failed to refresh tokens');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleExport = useCallback(() => {
    try {
      // Filter tokens inline to avoid dependency issues
      const filtered = tokens.filter(token => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          token.users.name?.toLowerCase().includes(searchLower) ||
          token.users.email.toLowerCase().includes(searchLower) ||
          token.users.student_id?.toLowerCase().includes(searchLower);

        const matchesPlatform = platformFilter === 'all' || token.platform === platformFilter;
        const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'active' && token.is_active) ||
          (statusFilter === 'inactive' && !token.is_active);

        return matchesSearch && matchesPlatform && matchesStatus;
      });

      const csv = exportTokensToCSV(filtered);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fcm-tokens-${sectionName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccessToast('Tokens exported successfully');
    } catch (error) {
      showErrorToast('Failed to export tokens');
    }
  }, [tokens, searchTerm, platformFilter, statusFilter, sectionName]);

  const handleSendTest = useCallback((userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setShowTestModal(true);
  }, []);

  const handleSendNotification = useCallback(async (payload: TestNotificationPayload) => {
    try {
      const result = await sendTestNotification(payload, sectionId, userId);
      if (result.success) {
        showSuccessToast(result.message);
      } else {
        showErrorToast(result.message);
      }
      return result;
    } catch (error: any) {
      const message = error.message || 'Failed to send notification';
      showErrorToast(message);
      return { success: false, message };
    }
  }, [sectionId, userId]);

  const handleSendBroadcast = useCallback(() => {
    setSelectedUser(null);
    setShowTestModal(true);
  }, []);

  // Filter tokens based on search and filters
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        token.users.name?.toLowerCase().includes(searchLower) ||
        token.users.email.toLowerCase().includes(searchLower) ||
        token.users.student_id?.toLowerCase().includes(searchLower);

      // Platform filter
      const matchesPlatform = platformFilter === 'all' || token.platform === platformFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && token.is_active) ||
        (statusFilter === 'inactive' && !token.is_active);

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [tokens, searchTerm, platformFilter, statusFilter]);

  const hasActiveFilters = searchTerm || platformFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setPlatformFilter('all');
    setStatusFilter('all');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            FCM Token Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage push notification tokens for {sectionName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExport}
            disabled={filteredTokens.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-sm"
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleSendBroadcast}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            title="Send broadcast notification"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Broadcast</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <FCMStats stats={stats} loading={loading} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or student ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="w-full lg:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none"
              >
                <option value="all">All Platforms</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {/* Filter Results Info */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredTokens.length} of {tokens.length} tokens
            </p>
          </div>
        )}
      </div>

      {/* Token List */}
      <FCMTokenList 
        tokens={filteredTokens} 
        loading={loading}
        onSendTest={handleSendTest}
      />

      {/* Test Notification Modal */}
      <TestNotificationModal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setSelectedUser(null);
        }}
        onSend={handleSendNotification}
        userName={selectedUser?.name}
        userId={selectedUser?.id}
      />
    </div>
  );
}

export default FCMTokenManager;
