import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Building2,
  Layers,
  FileText,
  UserCheck,
  Zap,
  Target,
  Bell
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../ui/card';

// Simple skeleton loader
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

interface AnalyticsData {
  // User Analytics
  totalUsers: number;
  students: number;
  admins: number;
  sectionAdmins: number;
  superAdmins: number;
  newUsersWeek: number;
  newUsersMonth: number;
  activeToday: number;
  activeWeek: number;
  
  // Task Analytics
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksCreatedWeek: number;
  tasksCreatedMonth: number;
  urgentTasks: number;
  highPriorityTasks: number;
  
  // System Analytics
  totalDepartments: number;
  totalBatches: number;
  totalSections: number;
  totalAssignments: number;
  totalActivities: number;
  activeFcmTokens: number;
  totalTemplates: number;
  
  // Department Distribution
  departmentStats: Array<{
    department_name: string;
    user_count: number;
    task_count: number;
    batch_count: number;
  }>;
  
  // Time Series Data
  userGrowth: Array<{ date: string; count: number }>;
  taskGrowth: Array<{ date: string; count: number }>;
  
  // Category Distribution
  taskCategories: Array<{ category: string; count: number }>;
  activityTypes: Array<{ type: string; count: number }>;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: string;
}

function StatCard({ title, value, icon, trend, subtitle, color = 'bg-blue-500' }: StatCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold mb-2">{value}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <div className={`text-${color.split('-')[1]}-600`}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProgressBar({ label, value, max, color = 'bg-blue-500' }: { label: string; value: number; max: number; color?: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} / {max}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div 
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Line Chart Component
function LineChart({ data, color = '#3b82f6' }: { data: Array<{ date: string; count: number }>; color?: string }) {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.count), 1);
  const width = 100;
  const height = 60;
  const padding = 5;
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((item.count / maxValue) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      {data.map((item, index) => {
        const x = (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
        const y = height - padding - ((item.count / maxValue) * (height - padding * 2));
        return <circle key={index} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

// Bar Chart Component
function BarChart({ data, maxValue, color = '#3b82f6' }: { data: Array<{ label: string; value: number }>; maxValue?: number; color?: string }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const percentage = (item.value / max) * 100;
        return (
          <div key={idx} className="group">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium truncate">{item.label}</span>
              <span className="text-muted-foreground ml-2">{item.value}</span>
            </div>
            <div className="relative w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="text-center text-muted-foreground text-sm">No data</div>;
  
  let currentAngle = -90;
  const radius = 40;
  const innerRadius = 28;
  const centerX = 50;
  const centerY = 50;
  
  const createArc = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + outerR * Math.cos(startRad);
    const y1 = centerY + outerR * Math.sin(startRad);
    const x2 = centerX + outerR * Math.cos(endRad);
    const y2 = centerY + outerR * Math.sin(endRad);
    const x3 = centerX + innerR * Math.cos(endRad);
    const y3 = centerY + innerR * Math.sin(endRad);
    const x4 = centerX + innerR * Math.cos(startRad);
    const y4 = centerY + innerR * Math.sin(startRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };
  
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-40 h-40">
        {data.map((item, idx) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const path = createArc(currentAngle, currentAngle + angle, radius, innerRadius);
          currentAngle += angle;
          
          return (
            <g key={idx}>
              <path d={path} fill={item.color} className="transition-all hover:opacity-80" />
            </g>
          );
        })}
        <circle cx={centerX} cy={centerY} r={innerRadius - 2} fill="currentColor" className="text-background" />
        <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-xl font-bold" fill="currentColor">
          {total}
        </text>
        <text x={centerX} y={centerY + 8} textAnchor="middle" className="text-xs" fill="currentColor" opacity="0.6">
          Total
        </text>
      </svg>
      <div className="flex-1 space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.value}</span>
              <span className="text-xs text-muted-foreground">({((item.value / total) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentCard({ dept }: { dept: { department_name: string; user_count: number; task_count: number; batch_count: number } }) {
  return (
    <Card className="p-5 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500 bg-opacity-10 rounded-lg">
          <Building2 className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-2 text-sm">{dept.department_name}</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Users</p>
              <p className="font-bold text-lg">{dept.user_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tasks</p>
              <p className="font-bold text-lg">{dept.task_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Batches</p>
              <p className="font-bold text-lg">{dept.batch_count}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SuperAdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [
        userStatsResult,
        taskStatsResult,
        systemStatsResult,
        departmentStatsResult,
        userGrowthResult,
        taskGrowthResult,
        taskCategoriesResult,
        activityTypesResult
      ] = await Promise.all([
        // User Statistics
        supabase.from('users').select('*').then(res => {
          const users = res.data || [];
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          return {
            total_users: users.length,
            students: users.filter(u => u.role === 'user').length,
            admins: users.filter(u => u.role === 'admin').length,
            section_admins: users.filter(u => u.role === 'section_admin').length,
            super_admins: users.filter(u => u.role === 'super-admin').length,
            new_users_week: users.filter(u => new Date(u.created_at) > weekAgo).length,
            new_users_month: users.filter(u => new Date(u.created_at) > monthAgo).length,
            active_today: users.filter(u => u.last_active && new Date(u.last_active) > dayAgo).length,
            active_week: users.filter(u => u.last_active && new Date(u.last_active) > weekAgo).length
          };
        }),
        
        // Task Statistics
        supabase.from('tasks').select('*').then(res => {
          const tasks = res.data || [];
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const today = now.toISOString().split('T')[0];
          
          return {
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            in_progress_tasks: tasks.filter(t => t.status === 'in-progress').length,
            pending_tasks: tasks.filter(t => t.status === 'pending').length,
            overdue_tasks: tasks.filter(t => t.due_date < today && t.status !== 'completed').length,
            tasks_created_week: tasks.filter(t => new Date(t.created_at) > weekAgo).length,
            tasks_created_month: tasks.filter(t => new Date(t.created_at) > monthAgo).length,
            urgent_tasks: tasks.filter(t => t.priority === 'urgent').length,
            high_priority_tasks: tasks.filter(t => t.priority === 'high').length
          };
        }),
        
        // System Statistics
        Promise.all([
          supabase.from('departments').select('*', { count: 'exact' }),
          supabase.from('batches').select('*', { count: 'exact' }),
          supabase.from('sections').select('*', { count: 'exact' }),
          supabase.from('task_assignments').select('*', { count: 'exact' }),
          supabase.from('activities').select('*', { count: 'exact' }),
          supabase.from('fcm_tokens').select('*', { count: 'exact' }).eq('is_active', true),
          supabase.from('task_templates').select('*', { count: 'exact' })
        ]).then(results => ({
          total_departments: results[0].count || 0,
          total_batches: results[1].count || 0,
          total_sections: results[2].count || 0,
          total_assignments: results[3].count || 0,
          total_activities: results[4].count || 0,
          active_fcm_tokens: results[5].count || 0,
          total_templates: results[6].count || 0
        })),
        
        // Department Distribution
        Promise.all([
          supabase.from('departments').select('id, name'),
          supabase.from('users').select('department_id'),
          supabase.from('tasks').select('department_id'),
          supabase.from('batches').select('department_id')
        ]).then(([depts, users, tasks, batches]) => {
          const departments = depts.data || [];
          const usersList = users.data || [];
          const tasksList = tasks.data || [];
          const batchesList = batches.data || [];
          
          return departments.map(dept => ({
            department_name: dept.name,
            user_count: usersList.filter(u => u.department_id === dept.id).length,
            task_count: tasksList.filter(t => t.department_id === dept.id).length,
            batch_count: batchesList.filter(b => b.department_id === dept.id).length
          }));
        }),
        
        // User Growth (Last 30 days)
        supabase.from('users').select('created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).then(res => {
          const data = res.data || [];
          const grouped: Record<string, number> = {};
          data.forEach(u => {
            const date = u.created_at.split('T')[0];
            grouped[date] = (grouped[date] || 0) + 1;
          });
          return Object.entries(grouped).map(([date, count]) => ({ date, count })).sort((a, b) => b.date.localeCompare(a.date));
        }),
        
        // Task Growth (Last 30 days)
        supabase.from('tasks').select('created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).then(res => {
          const data = res.data || [];
          const grouped: Record<string, number> = {};
          data.forEach(t => {
            const date = t.created_at.split('T')[0];
            grouped[date] = (grouped[date] || 0) + 1;
          });
          return Object.entries(grouped).map(([date, count]) => ({ date, count })).sort((a, b) => b.date.localeCompare(a.date));
        }),
        
        // Task Categories
        supabase.from('tasks').select('category').then(res => {
          const data = res.data || [];
          const grouped: Record<string, number> = {};
          data.forEach(t => {
            if (t.category) {
              grouped[t.category] = (grouped[t.category] || 0) + 1;
            }
          });
          return Object.entries(grouped).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
        }),
        
        // Activity Types
        supabase.from('activities').select('type').then(res => {
          const data = res.data || [];
          const grouped: Record<string, number> = {};
          data.forEach(a => {
            if (a.type) {
              grouped[a.type] = (grouped[a.type] || 0) + 1;
            }
          });
          return Object.entries(grouped).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 10);
        })
      ]);

      setData({
        totalUsers: userStatsResult.total_users || 0,
        students: userStatsResult.students || 0,
        admins: userStatsResult.admins || 0,
        sectionAdmins: userStatsResult.section_admins || 0,
        superAdmins: userStatsResult.super_admins || 0,
        newUsersWeek: userStatsResult.new_users_week || 0,
        newUsersMonth: userStatsResult.new_users_month || 0,
        activeToday: userStatsResult.active_today || 0,
        activeWeek: userStatsResult.active_week || 0,
        
        totalTasks: taskStatsResult.total_tasks || 0,
        completedTasks: taskStatsResult.completed_tasks || 0,
        inProgressTasks: taskStatsResult.in_progress_tasks || 0,
        pendingTasks: taskStatsResult.pending_tasks || 0,
        overdueTasks: taskStatsResult.overdue_tasks || 0,
        tasksCreatedWeek: taskStatsResult.tasks_created_week || 0,
        tasksCreatedMonth: taskStatsResult.tasks_created_month || 0,
        urgentTasks: taskStatsResult.urgent_tasks || 0,
        highPriorityTasks: taskStatsResult.high_priority_tasks || 0,
        
        totalDepartments: systemStatsResult.total_departments || 0,
        totalBatches: systemStatsResult.total_batches || 0,
        totalSections: systemStatsResult.total_sections || 0,
        totalAssignments: systemStatsResult.total_assignments || 0,
        totalActivities: systemStatsResult.total_activities || 0,
        activeFcmTokens: systemStatsResult.active_fcm_tokens || 0,
        totalTemplates: systemStatsResult.total_templates || 0,
        
        departmentStats: departmentStatsResult || [],
        userGrowth: userGrowthResult || [],
        taskGrowth: taskGrowthResult || [],
        taskCategories: taskCategoriesResult || [],
        activityTypes: activityTypesResult || []
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const completionRate = data.totalTasks > 0 ? ((data.completedTasks / data.totalTasks) * 100).toFixed(1) : '0';
  const activeUserRate = data.totalUsers > 0 ? ((data.activeWeek / data.totalUsers) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* User Analytics */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={data.totalUsers}
            icon={<Users className="w-6 h-6" />}
            subtitle={`${data.newUsersMonth} new this month`}
            color="bg-blue-500"
          />
          <StatCard
            title="Students"
            value={data.students}
            icon={<UserCheck className="w-6 h-6" />}
            subtitle={`${((data.students / data.totalUsers) * 100).toFixed(1)}% of total`}
            color="bg-green-500"
          />
          <StatCard
            title="Active Users (Week)"
            value={data.activeWeek}
            icon={<Activity className="w-6 h-6" />}
            subtitle={`${activeUserRate}% engagement rate`}
            color="bg-purple-500"
          />
          <StatCard
            title="Active Today"
            value={data.activeToday}
            icon={<Zap className="w-6 h-6" />}
            subtitle={`${data.activeWeek} active this week`}
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              User Growth Trend
            </h3>
            <LineChart 
              data={data.userGrowth.slice(0, 14).reverse()} 
              color="#3b82f6"
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last 14 days</span>
                <span className="font-semibold text-blue-600">
                  +{data.userGrowth.slice(0, 14).reduce((sum, item) => sum + item.count, 0)} users
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              User Roles Distribution
            </h3>
            <ProgressBar label="Students" value={data.students} max={data.totalUsers} color="bg-green-500" />
            <ProgressBar label="Section Admins" value={data.sectionAdmins} max={data.totalUsers} color="bg-blue-500" />
            <ProgressBar label="Admins" value={data.admins} max={data.totalUsers} color="bg-purple-500" />
            <ProgressBar label="Super Admins" value={data.superAdmins} max={data.totalUsers} color="bg-red-500" />
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Growth Summary
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">New Users (Week)</p>
                <p className="text-2xl font-bold text-green-600">+{data.newUsersWeek}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">New Users (Month)</p>
                <p className="text-2xl font-bold text-blue-600">+{data.newUsersMonth}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
                <p className="text-2xl font-bold text-purple-600">{activeUserRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Users
            </h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Active Today</p>
                <p className="text-4xl font-bold text-blue-600">{data.activeToday}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((data.activeToday / data.totalUsers) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-lg font-bold text-purple-600">{data.activeWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Engagement</span>
                  <span className="text-lg font-bold text-green-600">{activeUserRate}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Task Analytics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold">Task Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tasks"
            value={data.totalTasks}
            icon={<FileText className="w-6 h-6" />}
            subtitle={`${data.tasksCreatedMonth} created this month`}
            color="bg-indigo-500"
          />
          <StatCard
            title="Completed"
            value={data.completedTasks}
            icon={<CheckCircle2 className="w-6 h-6" />}
            subtitle={`${completionRate}% completion rate`}
            color="bg-green-500"
          />
          <StatCard
            title="In Progress"
            value={data.inProgressTasks}
            icon={<Clock className="w-6 h-6" />}
            subtitle={`${data.pendingTasks} pending`}
            color="bg-yellow-500"
          />
          <StatCard
            title="Overdue"
            value={data.overdueTasks}
            icon={<AlertTriangle className="w-6 h-6" />}
            subtitle={`${data.urgentTasks} urgent tasks`}
            color="bg-red-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Task Status Overview
            </h3>
            <DonutChart 
              data={[
                { label: 'Completed', value: data.completedTasks, color: '#22c55e' },
                { label: 'In Progress', value: data.inProgressTasks, color: '#eab308' },
                { label: 'Pending', value: data.pendingTasks, color: '#3b82f6' },
                { label: 'Overdue', value: data.overdueTasks, color: '#ef4444' }
              ]}
            />
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Task Creation Trend
            </h3>
            <LineChart 
              data={data.taskGrowth.slice(0, 14).reverse()} 
              color="#22c55e"
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last 14 days</span>
                <span className="font-semibold text-green-600">
                  +{data.taskGrowth.slice(0, 14).reduce((sum, item) => sum + item.count, 0)} tasks
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Task Categories
            </h3>
            <BarChart 
              data={data.taskCategories.slice(0, 5).map(cat => ({
                label: cat.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: cat.count
              }))}
              color="#6366f1"
            />
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Priority Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Urgent</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{data.urgentTasks}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">High Priority</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{data.highPriorityTasks}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Overdue</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{data.overdueTasks}</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* System Analytics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold">System Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            title="Departments"
            value={data.totalDepartments}
            icon={<Building2 className="w-5 h-5" />}
            color="bg-purple-500"
          />
          <StatCard
            title="Batches"
            value={data.totalBatches}
            icon={<Layers className="w-5 h-5" />}
            color="bg-blue-500"
          />
          <StatCard
            title="Sections"
            value={data.totalSections}
            icon={<Layers className="w-5 h-5" />}
            color="bg-indigo-500"
          />
          <StatCard
            title="Assignments"
            value={data.totalAssignments}
            icon={<FileText className="w-5 h-5" />}
            color="bg-green-500"
          />
          <StatCard
            title="Activities"
            value={data.totalActivities}
            icon={<Activity className="w-5 h-5" />}
            color="bg-orange-500"
          />
          <StatCard
            title="FCM Tokens"
            value={data.activeFcmTokens}
            icon={<Bell className="w-5 h-5" />}
            color="bg-red-500"
          />
          <StatCard
            title="Templates"
            value={data.totalTemplates}
            icon={<FileText className="w-5 h-5" />}
            color="bg-teal-500"
          />
        </div>
      </section>

      {/* Department Analytics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold">Department Distribution</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 gap-4">
            {data.departmentStats.map((dept, idx) => (
              <DepartmentCard key={idx} dept={dept} />
            ))}
          </div>
          <Card className="p-6">
            <h3 className="font-semibold mb-6">Department Comparison</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Users by Department</h4>
                <BarChart 
                  data={data.departmentStats.map(d => ({
                    label: d.department_name.split(' ')[0],
                    value: d.user_count
                  }))}
                  color="#a855f7"
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Tasks by Department</h4>
                <BarChart 
                  data={data.departmentStats.map(d => ({
                    label: d.department_name.split(' ')[0],
                    value: d.task_count
                  }))}
                  color="#3b82f6"
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Activity Analytics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold">System Activity</h2>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Activity Breakdown</h3>
          <BarChart 
            data={data.activityTypes.map(activity => ({
              label: activity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: activity.count
            }))}
            color="#f97316"
          />
        </Card>
      </section>
    </div>
  );
}
