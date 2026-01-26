import { supabase } from '../lib/supabase';
import type { Task } from '../types';

/**
 * Optimized Dashboard Service
 * Reduces database query load and implements caching for better performance
 */

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
}

interface TasksByCategory {
  [category: string]: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
}

// Cache for dashboard data with TTL
const dashboardCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCacheKey = (type: string, params?: any) => {
  return `dashboard_${type}_${JSON.stringify(params || {})}`;
};

const getCachedData = (key: string) => {
  const cached = dashboardCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  dashboardCache.delete(key);
  return null;
};

const setCacheData = (key: string, data: any, ttlMs: number = 30000) => {
  dashboardCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
};

/**
 * Fetch optimized dashboard statistics using aggregate queries
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const cacheKey = getCacheKey('stats');
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Optimized task statistics query using the new indexes
    const { data: taskStats, error: taskError } = await supabase
      .from('tasks')
      .select('status, created_at')
      .not('status', 'is', null);

    if (taskError) throw taskError;

    // Optimized user statistics query
    const { data: userStats, error: userError } = await supabase
      .from('users')
      .select('created_at, last_active');

    if (userError) throw userError;

    // Calculate statistics efficiently
    const totalTasks = taskStats?.length || 0;
    const completedTasks = taskStats?.filter(t => t.status === 'completed').length || 0;
    const inProgressTasks = taskStats?.filter(t => t.status === 'in-progress').length || 0;
    const pendingTasks = taskStats?.filter(t => ['assigned', 'pending'].includes(t.status)).length || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // User statistics
    const totalUsers = userStats?.length || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeUsers = userStats?.filter(u => 
      u.last_active && new Date(u.last_active) >= today
    ).length || 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = userStats?.filter(u => 
      new Date(u.created_at) >= weekAgo
    ).length || 0;

    const stats: DashboardStats = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      completionRate,
      totalUsers,
      activeUsers,
      newUsersThisWeek,
    };

    setCacheData(cacheKey, stats, 60000); // 1 minute cache
    return stats;

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Failed to load dashboard statistics');
  }
}

/**
 * Fetch recent tasks for dashboard overview (optimized with covering index)
 */
export async function fetchRecentTasks(limit: number = 5): Promise<Task[]> {
  const cacheKey = getCacheKey('recent_tasks', { limit });
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Optimized query using the covering index
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        status,
        category,
        due_date,
        priority,
        created_at,
        assigned_to
      `)
      .not('status', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    setCacheData(cacheKey, data || [], 30000); // 30 second cache
    return data || [];

  } catch (error) {
    console.error('Error fetching recent tasks:', error);
    throw new Error('Failed to load recent tasks');
  }
}

/**
 * Fetch task distribution by category for charts (optimized)
 */
export async function fetchTasksByCategory(): Promise<TasksByCategory> {
  const cacheKey = getCacheKey('tasks_by_category');
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Optimized query using the category-status index
    const { data, error } = await supabase
      .from('tasks')
      .select('category, status')
      .not('category', 'is', null)
      .not('status', 'is', null);

    if (error) throw error;

    // Efficiently group data
    const tasksByCategory: TasksByCategory = {};
    
    data?.forEach(task => {
      const { category, status } = task;
      if (!tasksByCategory[category]) {
        tasksByCategory[category] = {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
        };
      }
      
      tasksByCategory[category].total++;
      
      if (status === 'completed') {
        tasksByCategory[category].completed++;
      } else if (status === 'in-progress') {
        tasksByCategory[category].inProgress++;
      } else if (['assigned', 'pending'].includes(status)) {
        tasksByCategory[category].pending++;
      }
    });

    setCacheData(cacheKey, tasksByCategory, 45000); // 45 second cache
    return tasksByCategory;

  } catch (error) {
    console.error('Error fetching tasks by category:', error);
    throw new Error('Failed to load task categories');
  }
}

/**
 * Fetch overdue tasks for dashboard alerts (optimized)
 */
export async function fetchOverdueTasks(): Promise<Task[]> {
  const cacheKey = getCacheKey('overdue_tasks');
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Optimized query using the due date index
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        due_date,
        status,
        priority,
        assigned_to
      `)
      .lt('due_date', today)
      .not('status', 'eq', 'completed')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(10);

    if (error) throw error;

    setCacheData(cacheKey, data || [], 20000); // 20 second cache
    return data || [];

  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    throw new Error('Failed to load overdue tasks');
  }
}

/**
 * Clear dashboard cache (useful for real-time updates)
 */
export function clearDashboardCache() {
  const keysToDelete = Array.from(dashboardCache.keys()).filter(key => key.startsWith('dashboard_'));
  keysToDelete.forEach(key => dashboardCache.delete(key));
}

/**
 * Get cache statistics for monitoring
 */
export function getDashboardCacheStats() {
  const totalKeys = dashboardCache.size;
  const dashboardKeys = Array.from(dashboardCache.keys()).filter(key => key.startsWith('dashboard_')).length;
  
  return {
    totalCacheSize: totalKeys,
    dashboardCacheSize: dashboardKeys,
    cacheHitRate: totalKeys > 0 ? Math.round((dashboardKeys / totalKeys) * 100) : 0,
  };
}