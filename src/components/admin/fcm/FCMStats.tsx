import { useMemo } from 'react';
import { Smartphone, Monitor, Tablet, TrendingUp, Users, Bell } from 'lucide-react';
import type { FCMStatistics } from '../../../types/fcm';

interface FCMStatsProps {
  stats: FCMStatistics;
  loading?: boolean;
}

export function FCMStats({ stats, loading }: FCMStatsProps) {
  const statCards = useMemo(() => [
    {
      title: 'Total Active Tokens',
      value: stats.activeTokens,
      total: stats.totalTokens,
      icon: Bell,
      color: 'blue',
      description: `${stats.inactiveTokens} inactive`,
    },
    {
      title: 'Android Devices',
      value: stats.androidTokens,
      icon: Smartphone,
      color: 'green',
      description: `${((stats.androidTokens / stats.activeTokens) * 100 || 0).toFixed(0)}% of active`,
    },
    {
      title: 'iOS Devices',
      value: stats.iosTokens,
      icon: Tablet,
      color: 'purple',
      description: `${((stats.iosTokens / stats.activeTokens) * 100 || 0).toFixed(0)}% of active`,
    },
    {
      title: 'Web Tokens',
      value: stats.webTokens,
      icon: Monitor,
      color: 'orange',
      description: `${((stats.webTokens / stats.activeTokens) * 100 || 0).toFixed(0)}% of active`,
    },
    {
      title: 'User Coverage',
      value: `${stats.coveragePercentage.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'indigo',
      description: `${stats.usersWithTokens} of ${stats.totalUsers} users`,
    },
    {
      title: 'Users with Tokens',
      value: stats.usersWithTokens,
      total: stats.totalUsers,
      icon: Users,
      color: 'cyan',
      description: `${stats.totalUsers - stats.usersWithTokens} without tokens`,
    },
  ], [stats]);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', icon: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-600 dark:text-purple-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', icon: 'text-orange-600 dark:text-orange-400' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', icon: 'text-indigo-600 dark:text-indigo-400' },
      cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', icon: 'text-cyan-600 dark:text-cyan-400' },
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {statCards.map((card, index) => {
        const colors = getColorClasses(card.color);
        const Icon = card.icon;
        
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${colors.bg}`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              {card.total !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  / {card.total}
                </span>
              )}
            </div>
            
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {card.title}
            </h3>
            
            <p className={`text-2xl font-bold ${colors.text} mb-1`}>
              {card.value}
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
