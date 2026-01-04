import { AdminAnalytics as OriginalAdminAnalytics } from './AdminAnalytics';
import { AdminLogs as OriginalAdminLogs } from './AdminLogs';
import { SecuritySettings as OriginalSecuritySettings } from './SecuritySettings';
import { SectionAdminManagementNew } from './SectionAdminManagementNew.tsx';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { AdminLog, AdminStats } from '../../../types/admin';

export function SectionAdminManagementWrapper() {
  return <SectionAdminManagementNew />;
}

export function AdminAnalyticsWrapper() {
  const { admins, loading: adminsLoading } = useAdminUsers();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Generate mock stats based on actual admins
        const mockStats: AdminStats = {
          totalAdmins: admins.length,
          activeAdmins: admins.filter(a => a.isActive).length,
          disabledAdmins: admins.filter(a => !a.isActive).length,
          permissionChanges: Math.floor(Math.random() * 15) + 5,
          departmentDistribution: [],
          roleDistribution: [],
          monthlyActivity: [],
          permissionUsage: [],
          recentLogins: [],
          mostActiveAdmins: [],
          adminsByDepartment: {}
        };
        
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!adminsLoading && admins.length > 0) {
      fetchStats();
    }
  }, [admins, adminsLoading]);

  return <OriginalAdminAnalytics stats={stats} loading={loading} />;
}

export function AdminLogsWrapper() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        
        const { data: activities } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (activities) {
          const mappedLogs: AdminLog[] = activities.map(a => ({
            id: a.id,
            timestamp: a.created_at,
            adminId: a.user_id || '',
            adminName: 'Admin',
            action: a.type,
            target: a.title,
            details: {
              description: a.title,
              metadata: a.metadata
            },
            ipAddress: '0.0.0.0',
            userAgent: 'N/A',
            status: 'success' as const
          }));
          
          setLogs(mappedLogs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return <OriginalAdminLogs logs={logs} loading={loading} />;
}

export function SecuritySettingsWrapper() {
  const { admins, resetPassword } = useAdminUsers();

  return (
    <OriginalSecuritySettings
      admins={admins}
      onResetPassword={resetPassword}
    />
  );
}
