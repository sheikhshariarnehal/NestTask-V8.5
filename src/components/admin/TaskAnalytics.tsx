import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Target } from 'lucide-react';
import { getTaskAnalytics } from '../../services/taskEnhanced.service';
import type { TaskAnalyticsData } from '../../types/taskEnhanced';
import { LoadingSpinner } from '../LoadingSpinner';

interface TaskAnalyticsProps {
  sectionId?: string;
}

const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'],
  status: {
    'my-tasks': '#94a3b8',
    'in-progress': '#f59e0b',
    'completed': '#10b981',
  },
  priority: {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  },
};

export function TaskAnalytics({ sectionId }: TaskAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TaskAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [sectionId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTaskAnalytics(sectionId);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>Failed to load analytics: {error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { statistics } = analytics;

  return (
    <div className="space-y-6 p-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={statistics.totalTasks}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={statistics.completedTasks}
          subtitle={`${statistics.completionRate.toFixed(1)}% completion`}
          icon={<CheckCircle2 className="w-6 h-6" />}
          color="green"
          trend={statistics.completionRate >= 70 ? 'up' : 'down'}
        />
        <StatCard
          title="In Progress"
          value={statistics.inProgressTasks}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Overdue"
          value={statistics.overdueTasks}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
          trend={statistics.overdueTasks > 0 ? 'down' : undefined}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <ChartCard title="Tasks by Category">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="category"
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.priorityDistribution}
                dataKey="count"
                nameKey="priority"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.priority}: ${entry.count}`}
              >
                {analytics.priorityDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS.priority[entry.priority as keyof typeof COLORS.priority] || COLORS.primary[index]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard title="Tasks by Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.statusDistribution}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.status}: ${entry.count}`}
              >
                {analytics.statusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS.status[entry.status as keyof typeof COLORS.status] || COLORS.primary[index]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Overdue by Category */}
        {analytics.overdueByCategory.length > 0 && (
          <ChartCard title="Overdue Tasks by Category">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.overdueByCategory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="category"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* High Priority Tasks Alert */}
      {statistics.highPriorityTasks > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                High Priority Tasks
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                You have {statistics.highPriorityTasks} high priority or urgent tasks that need attention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red';
  trend?: 'up' | 'down';
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-xs mt-1 opacity-70">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-sm">
          {trend === 'up' ? (
            <>
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Good performance</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs">Needs attention</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}
