import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement 
} from '../services/announcement.service';
import type { Announcement, NewAnnouncement } from '../types/announcement';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();

    // Debounced realtime subscription to prevent rapid refreshes
    let realtimeTimeout: number | null = null;
    let lastUpdate = 0;

    const subscription = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          const now = Date.now();
          // Skip if we just processed an update (within 5 seconds)
          if (now - lastUpdate < 5000) return;
          
          if (realtimeTimeout) {
            clearTimeout(realtimeTimeout);
          }
          
          realtimeTimeout = window.setTimeout(() => {
            lastUpdate = Date.now();
            loadAnnouncements();
          }, 2000); // 2 second debounce
        }
      )
      .subscribe();

    return () => {
      if (realtimeTimeout) {
        clearTimeout(realtimeTimeout);
      }
      subscription.unsubscribe();
    };
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async (newAnnouncement: NewAnnouncement) => {
    try {
      setError(null);
      await createAnnouncement(newAnnouncement);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      setError(null);
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Function to manually refresh announcements
  const refreshAnnouncements = useCallback(async () => {
    try {
      return await loadAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to refresh announcements:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAnnouncements]);

  return {
    announcements,
    loading,
    error,
    createAnnouncement: handleCreateAnnouncement,
    deleteAnnouncement: handleDeleteAnnouncement,
    refreshAnnouncements
  };
}