import { AdminLogs as OriginalAdminLogs } from './AdminLogs';
import { SecuritySettings as OriginalSecuritySettings } from './SecuritySettings';
import { SectionAdminManagementNew } from './SectionAdminManagementNew.tsx';
import { SuperAdminAnalytics } from './SuperAdminAnalytics';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { AdminLog } from '../../../types/admin';

export function SectionAdminManagementWrapper() {
  return <SectionAdminManagementNew />;
}

export function AdminAnalyticsWrapper() {
  return <SuperAdminAnalytics />;
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
