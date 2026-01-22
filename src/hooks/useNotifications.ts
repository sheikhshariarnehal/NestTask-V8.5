import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

    const [{ data: tasks }, { data: announcements }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},is_admin_task.eq.true`)
        .order('created_at', { ascending: false }),
      supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
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
  const setupSubscriptions = useCallback(async () => {
    if (!userId || isSubscribedRef.current) {
      return;
    }

    isSubscribedRef.current = true;

    // Remove any existing channels with the same names to avoid duplicate subscription errors
    // This is critical after app resume when channels may still exist in Supabase client
    try {
      const existingChannels = supabase.getChannels();
      for (const channel of existingChannels) {
        if (channel.topic === 'realtime:tasks' || channel.topic === 'realtime:announcements') {
          console.log(`[Notifications] Removing existing channel: ${channel.topic}`);
          await supabase.removeChannel(channel);
        }
      }
    } catch (e) {
      console.warn('[Notifications] Error cleaning up existing channels:', e);
    }

    // Small delay to ensure channels are fully removed
    await new Promise(resolve => setTimeout(resolve, 100));

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
   * Cleanup subscriptions - properly remove channels from Supabase client
   */
  const cleanupSubscriptions = useCallback(async () => {
    console.log('[Notifications] Cleaning up subscriptions...');
    isSubscribedRef.current = false;

    // Properly remove channels from Supabase client to avoid "subscribe multiple times" errors
    try {
      if (subscriptionsRef.current.tasks) {
        await supabase.removeChannel(subscriptionsRef.current.tasks);
        subscriptionsRef.current.tasks = undefined;
      }
    } catch (e) {
      console.warn('[Notifications] Error removing tasks channel:', e);
    }
    
    try {
      if (subscriptionsRef.current.announcements) {
        await supabase.removeChannel(subscriptionsRef.current.announcements);
        subscriptionsRef.current.announcements = undefined;
      }
    } catch (e) {
      console.warn('[Notifications] Error removing announcements channel:', e);
    }
  }, []);

  /**
   * Handle app resume - reload data and reconnect subscriptions
   * Now triggered by coordinated resume (session already validated, channels cleaned by coordinator)
   */
  const handleResume = useCallback(async () => {
    if (!userId) return;
    
    console.log('[Notifications] Resume ready - setting up subscriptions');

    // Reload data
    loadExistingItems();

    // Setup subscriptions (channels already cleaned by coordinator)
    await setupSubscriptions();
  }, [userId, loadExistingItems, setupSubscriptions]);

  // Listen for coordinated resume event (instead of useAppLifecycle)
  useEffect(() => {
    window.addEventListener('app-resume-ready', handleResume);
    return () => window.removeEventListener('app-resume-ready', handleResume);
  }, [handleResume]);

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