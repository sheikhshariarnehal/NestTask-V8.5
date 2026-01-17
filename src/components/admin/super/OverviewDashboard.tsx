import { useEffect, useState } from 'react';
import { 
  Users, 
  Shield, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Database,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { supabase } from '../../../lib/supabase';

interface DatabaseStats {
  total_users: number;
  total_admins: number;
  total_section_admins: number;
  total_tasks: number;
  completed_tasks: number;
  total_departments: number;
  total_batches: number;
  total_sections: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  metadata: any;
  created_at: string;
  user?: {
    name: string;
    email: string;
  } | {
    name: string;
    email: string;
  }[] | null;
}

export function OverviewDashboard() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch database statistics
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {});
      
      if (statsError) {
        // Fallback to individual queries if RPC doesn't exist
        const [usersCount, adminsCount, sectionAdminsCount, tasksCount, completedTasksCount, 
               deptsCount, batchesCount, sectionsCount] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'section_admin'),
          supabase.from('tasks').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('departments').select('*', { count: 'exact', head: true }),
          supabase.from('batches').select('*', { count: 'exact', head: true }),
          supabase.from('sections').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          total_users: usersCount.count || 0,
          total_admins: adminsCount.count || 0,
          total_section_admins: sectionAdminsCount.count || 0,
          total_tasks: tasksCount.count || 0,
          completed_tasks: completedTasksCount.count || 0,
          total_departments: deptsCount.count || 0,
          total_batches: batchesCount.count || 0,
          total_sections: sectionsCount.count || 0,
        });
      } else {
        setStats(statsData);
      }

      // Fetch recent activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          title,
          metadata,
          created_at,
          user:users(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesData) {
        setRecentActivities(activitiesData.map(a => ({
          ...a,
          user: Array.isArray(a.user) ? a.user[0] : a.user
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.total_users,
      change: '+12%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Admins',
      value: stats.total_admins,
      change: '+3%',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Section Admins',
      value: stats.total_section_admins,
      change: '+8%',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Total Tasks',
      value: stats.total_tasks,
      change: '+24%',
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: 'Completed Tasks',
      value: stats.completed_tasks,
      change: `${stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Departments',
      value: stats.total_departments,
      change: '',
      icon: Database,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      title: 'Batches',
      value: stats.total_batches,
      change: '',
      icon: Layers,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      title: 'Sections',
      value: stats.total_sections,
      change: '',
      icon: Layers,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(stat.value ?? 0).toLocaleString()}
                </div>
                {stat.change && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change} from last month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system activities and updates</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No recent activities to display
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(activity.user && typeof activity.user === 'object' && !Array.isArray(activity.user)) 
                          ? (activity.user.name || activity.user.email) 
                          : 'System'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health - Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Organization Structure
            </CardTitle>
            <CardDescription>Hierarchical breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Departments</span>
                <Badge variant="info">{stats?.total_departments || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Batches</span>
                <Badge variant="info">{stats?.total_batches || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Sections</span>
                <Badge variant="info">{stats?.total_sections || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Task Overview
            </CardTitle>
            <CardDescription>Current task statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Total Tasks</span>
                <Badge variant="info">{stats?.total_tasks || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Completed</span>
                <Badge variant="success">{stats?.completed_tasks || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Pending</span>
                <Badge variant="warning">
                  {(stats?.total_tasks || 0) - (stats?.completed_tasks || 0)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}