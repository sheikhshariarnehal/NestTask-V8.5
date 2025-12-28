import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchTeachers, 
  createTeacher, 
  updateTeacher, 
  deleteTeacher,
  bulkImportTeachers as bulkImportTeachersService,
  TeacherBulkImportItem
} from '../services/teacher.service';
import type { Teacher, NewTeacher } from '../types/teacher';
import type { Course } from '../types/course';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeachers = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Always fetch fresh data for admin dashboard
      console.log('Admin dashboard: Fetching fresh teacher data');
      const data = await fetchTeachers();
      setTeachers(data);
    } catch (err: any) {
      console.error('Error loading teachers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();

    // Debounced realtime subscription
    let realtimeTimeout: number | null = null;
    let lastUpdate = 0;

    const subscription = supabase
      .channel('teachers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teachers'
        },
        () => {
          const now = Date.now();
          if (now - lastUpdate < 5000) return;
          
          if (realtimeTimeout) clearTimeout(realtimeTimeout);
          realtimeTimeout = window.setTimeout(() => {
            lastUpdate = Date.now();
            loadTeachers(true);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      if (realtimeTimeout) clearTimeout(realtimeTimeout);
      subscription.unsubscribe();
    };
  }, [loadTeachers]);

  const handleCreateTeacher = async (teacher: NewTeacher, courseIds: string[]) => {
    try {
      setError(null);
      await createTeacher(teacher, courseIds);
      await loadTeachers(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateTeacher = async (id: string, updates: Partial<Teacher>, courseIds: string[]) => {
    try {
      setError(null);
      await updateTeacher(id, updates, courseIds);
      await loadTeachers(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      setError(null);
      
      // Immediately remove teacher from state for better UI responsiveness
      setTeachers(prev => prev.filter(t => t.id !== id));
      
      try {
        console.log(`Initiating deletion of teacher with ID: ${id} from database`);
        
        // Call the service function to delete the teacher
        await deleteTeacher(id);
        
        console.log(`Teacher ${id} successfully deleted from database`);
        
      } catch (deleteError: any) {
        console.error('Error in teacher deletion operation:', deleteError);
        setError(`Failed to delete teacher: ${deleteError.message || 'Unknown error'}`);
        // Restore the teacher in the state if deletion fails
        await loadTeachers(true);
      }
      
      // Force a refresh from the database after a small delay to ensure consistency
      setTimeout(() => {
        loadTeachers(true);
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete teacher');
      throw err;
    }
  };

  const handleBulkImportTeachers = async (teachersData: TeacherBulkImportItem[]): Promise<{ success: number; errors: any[] }> => {
    try {
      const result = await bulkImportTeachersService(teachersData);
      
      // Reload teachers to get updated data
      await loadTeachers(true);
      
      return result;
    } catch (error: any) {
      console.error('Error in bulk import teachers:', error);
      setError(error.message);
      throw error;
    }
  };

  return {
    teachers,
    loading,
    error,
    createTeacher: handleCreateTeacher,
    updateTeacher: handleUpdateTeacher,
    deleteTeacher: handleDeleteTeacher,
    bulkImportTeachers: handleBulkImportTeachers,
    refreshTeachers: () => loadTeachers(true)
  };
}