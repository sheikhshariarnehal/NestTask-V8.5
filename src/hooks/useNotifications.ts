import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppLifecycle } from './useAppLifecycle';
import type { Task } from '../types';
import type { Announcement } from '../types/announcement';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  taskId?: string;
  announcementId?: string;
  isAdminTask: boolean;
  isAnnouncement: boolean;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionsRef = useRef<{ tasks?: any; announcements?: any }>({});
  const isSubscribedRef = useRef(false);

  const sortNotifications = (notifs: Notification[]): Notification[] => {
    return [...notifs].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };

  /**
   * Load existing notifications from database
   */
  const loadExistingItems = useCallback(async () => {
    if (!userId) return;

    // Minimal field selection for notifications - only fetch what's needed
    const TASK_NOTIFICATION_FIELDS = 'id,name,is_admin_task,created_at';
    const ANNOUNCEMENT_FIELDS = 'id,title,content,created_at';

    const [{ data: tasks }, { data: announcements }] = await Promise.all([
      supabase
        .from('tasks')
        .select(TASK_NOTIFICATION_FIELDS)
        .or(`user_id.eq.${userId},is_admin_task.eq.true`)
        .order('created_at', { ascending: false })
        .limit(50), // Limit to recent tasks for notifications
      supabase
        .from('announcements')
        .select(ANNOUNCEMENT_FIELDS)
        .order('created_at', { ascending: false })
        .limit(20) // Limit announcements
    ]);

    const newNotifications: Notification[] = [];

    if (tasks) {
      tasks.forEach(task => {
        newNotifications.push({
          id: crypto.randomUUID(),
          title: task.is_admin_task ? 'New Admin Task' : 'New Task',
          message: `Task "${task.name}" has been created`,
          timestamp: new Date(task.created_at),
          read: false,
          taskId: task.id,
          isAdminTask: task.is_admin_task,
          isAnnouncement: false
        });
      });
    }

    if (announcements) {
      announcements.forEach(announcement => {
        newNotifications.push({
          id: crypto.randomUUID(),
          title: announcement.title,
          message: announcement.content,
          timestamp: new Date(announcement.created_at),
          read: false,
          announcementId: announcement.id,
          isAdminTask: false,
          isAnnouncement: true
        });
      });
    }

    const sortedNotifications = sortNotifications(newNotifications);
    setNotifications(sortedNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  }, [userId]);

  /**
   * Setup Realtime subscriptions
   */
  const setupSubscriptions = useCallback(() => {
    if (!userId || isSubscribedRef.current) {
      return;
    }

    isSubscribedRef.current = true;

    // Unsubscribe from any existing subscriptions first
    if (subscriptionsRef.current.tasks) {
      subscriptionsRef.current.tasks.unsubscribe();
    }
    if (subscriptionsRef.current.announcements) {
      subscriptionsRef.current.announcements.unsubscribe();
    }

    const taskSubscription = supabase
      .channel('tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          handleNewTask(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: 'is_admin_task=eq.true'
        },
        (payload) => {
          handleNewTask(payload.new as any);
        }
      )
      .subscribe();

    const announcementSubscription = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          handleNewAnnouncement(payload.new as any);
        }
      )
      .subscribe();

    // Store subscription references for cleanup
    subscriptionsRef.current = {
      tasks: taskSubscription,
      announcements: announcementSubscription
    };
  }, [userId]);

  /**
   * Cleanup subscriptions
   */
  const cleanupSubscriptions = useCallback(() => {
    console.log('[Notifications] Cleaning up subscriptions...');
    isSubscribedRef.current = false;

    if (subscriptionsRef.current.tasks) {
      subscriptionsRef.current.tasks.unsubscribe();
      subscriptionsRef.current.tasks = undefined;
    }
    if (subscriptionsRef.current.announcements) {
      subscriptionsRef.current.announcements.unsubscribe();
      subscriptionsRef.current.announcements = undefined;
    }
  }, []);

  /**
   * Handle app resume - reload data and reconnect subscriptions
   */
  const handleResume = useCallback(() => {
    console.log('[Notifications] App resumed, reloading data and reconnecting...');

    // Cleanup old subscriptions
    cleanupSubscriptions();

    // Reload data
    loadExistingItems();

    // Re-setup subscriptions
    setupSubscriptions();
  }, [cleanupSubscriptions, loadExistingItems, setupSubscriptions]);

  // Use app lifecycle hook to handle resume
  useAppLifecycle({
    onResume: handleResume
  });

  // Initial load and subscription setup
  useEffect(() => {
    if (!userId) {
      // Clear subscriptions if no user
      cleanupSubscriptions();
      return;
    }

    // Load initial data
    loadExistingItems();

    // Setup subscriptions
    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      cleanupSubscriptions();
    };
  }, [userId, loadExistingItems, setupSubscriptions, cleanupSubscriptions]);

  const handleNewTask = (task: any) => {
    if (task.is_admin_task || task.user_id === userId) {
      const notification: Notification = {
        id: crypto.randomUUID(),
        title: task.is_admin_task ? 'New Admin Task' : 'New Task',
        message: `Task "${task.name}" has been created`,
        timestamp: new Date(),
        read: false,
        taskId: task.id,
        isAdminTask: task.is_admin_task,
        isAnnouncement: false
      };

      setNotifications(prev => sortNotifications([notification, ...prev]));
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleNewAnnouncement = (announcement: any) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      title: announcement.title,
      message: announcement.content, // Use the content field from announcement
      timestamp: new Date(),
      read: false,
      announcementId: announcement.id,
      isAdminTask: false,
      isAnnouncement: true
    };

    setNotifications(prev => sortNotifications([notification, ...prev]));
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      sortNotifications(
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      sortNotifications(
        prev.map(notification => ({ ...notification, read: true }))
      )
    );
    setUnreadCount(0);
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return sortNotifications(prev.filter(n => n.id !== notificationId));
    });
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  };
}