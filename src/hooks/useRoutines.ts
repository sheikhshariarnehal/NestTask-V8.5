import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchRoutines,
  createRoutine as createRoutineService,
  updateRoutine as updateRoutineService,
  deleteRoutine as deleteRoutineService,
  addRoutineSlot,
  updateRoutineSlot,
  deleteRoutineSlot,
  activateRoutine as activateRoutineService,
  deactivateRoutine as deactivateRoutineService,
  bulkImportRoutineSlots as bulkImportRoutineSlotsService,
  exportRoutineWithSlots as exportRoutineWithSlotsService,
  getAllSemesters as getAllSemestersService,
  getRoutinesBySemester as getRoutinesBySemesterService
} from '../services/routine.service';
import type { Routine, RoutineSlot } from '../types/routine';

export function useRoutines(userId?: string) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  const loadRoutines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch fresh data from server
      console.log('[Debug] Fetching fresh routines from server');
      const data = await fetchRoutines();
      console.log(`[Debug] Received ${data.length} routines from server`);
      setRoutines(data);
    } catch (err: any) {
      console.error('Error fetching routines:', err);
      setError(err.message || 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load routines on initial mount
    loadRoutines();

    // Debounced realtime subscription
    let realtimeTimeout: number | null = null;
    let lastUpdate = 0;

    const subscription = supabase
      .channel('routines_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'routines'
      }, () => {
        const now = Date.now();
        if (now - lastUpdate < 5000) return;
        
        if (realtimeTimeout) clearTimeout(realtimeTimeout);
        realtimeTimeout = window.setTimeout(() => {
          lastUpdate = Date.now();
          loadRoutines();
        }, 2000);
      })
      .subscribe();

    // Removed visibility change handler - AdminDashboard handles this centrally

    return () => {
        if (realtimeTimeout) clearTimeout(realtimeTimeout);
        subscription.unsubscribe();
      };
  }, [loadRoutines]); // Create a new routine
  const handleCreateRoutine = async (routine: Omit<Routine, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const createdRoutine = await createRoutineService(routine);
      // Update local state with the created routine
      setRoutines(prev => {
        const updated = [...prev, createdRoutine];
        return updated;
      });
      return createdRoutine;
    } catch (err: any) {
      console.error('Error creating routine:', err);
      throw err;
    }
  };

  // Update a routine
  const handleUpdateRoutine = async (routineId: string, updates: Partial<Routine>) => {
    try {
      await updateRoutineService(routineId, updates);
      
      // Update local state with the updated routine
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, ...updates } : routine
        );
        return updated;
      });
      
      // Since the API doesn't return the updated routine, we'll construct it from our local state
      const updatedRoutine = routines.find(r => r.id === routineId);
      if (!updatedRoutine) {
        throw new Error('Routine not found after update');
      }
      
      return { ...updatedRoutine, ...updates };
    } catch (err: any) {
      console.error('Error updating routine:', err);
      throw err;
    }
  };

  // Delete a routine
  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await deleteRoutineService(routineId);
      
      // Update local state by removing the deleted routine
      setRoutines(prev => {
        const updated = prev.filter(routine => routine.id !== routineId);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      throw err;
    }
  };

  // Refresh routines manually
  const refreshRoutines = () => {
    return loadRoutines();
  };

  // New function to prefetch related data for faster loading
  const prefetchRoutineData = useCallback(async () => {
    try {
      // Prefetch commonly needed static data in parallel
      await Promise.all([
        supabase.from('courses').select('id,name,code').then(),
        supabase.from('teachers').select('id,name').then(),
        supabase.from('departments').select('id,name').then(),
      ]);
    } catch (err) {
      console.error('Error prefetching routine data:', err);
    }
  }, []);

  // Add prefetch call to the main effect
  useEffect(() => {
    prefetchRoutineData(); // Prefetch related data while loading routines
  }, [prefetchRoutineData]);

  // Activate a routine
  const activateRoutine = async (routineId: string) => {
    try {
      await activateRoutineService(routineId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, isActive: true } : routine
        );
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error activating routine:', err);
      throw err;
    }
  };

  // Deactivate a routine
  const deactivateRoutine = async (routineId: string) => {
    try {
      await deactivateRoutineService(routineId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, isActive: false } : routine
        );
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deactivating routine:', err);
      throw err;
    }
  };

  // Add a routine slot
  const handleAddRoutineSlot = async (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => {
    try {
      const addedSlot = await addRoutineSlot(routineId, slot);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId) {
            const updatedSlots = routine.slots ? [...routine.slots, addedSlot] : [addedSlot];
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        return updated;
      });
      
      return addedSlot;
    } catch (err: any) {
      console.error('Error adding routine slot:', err);
      throw err;
    }
  };

  // Update a routine slot
  const handleUpdateRoutineSlot = async (routineId: string, slotId: string, updates: Partial<RoutineSlot>) => {
    try {
      await updateRoutineSlot(routineId, slotId, updates);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId && routine.slots) {
            const updatedSlots = routine.slots.map(slot => 
              slot.id === slotId ? { ...slot, ...updates } : slot
            );
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error updating routine slot:', err);
      throw err;
    }
  };

  // Delete a routine slot
  const handleDeleteRoutineSlot = async (routineId: string, slotId: string) => {
    try {
      await deleteRoutineSlot(routineId, slotId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId && routine.slots) {
            const updatedSlots = routine.slots.filter(slot => slot.id !== slotId);
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting routine slot:', err);
      throw err;
    }
  };

  const bulkImportSlots = async (routineId: string, slotsData: any[]): Promise<{ success: number; errors: any[] }> => {
    try {
      const result = await bulkImportRoutineSlotsService(routineId, slotsData);
      
      // Refresh routines to get updated data
      await loadRoutines();
      
      return result;
    } catch (err: any) {
      console.error('Error bulk importing slots:', err);
      throw err;
    }
  };

  const exportRoutine = async (routineId: string) => {
    try {
      return await exportRoutineWithSlotsService(routineId);
    } catch (err: any) {
      console.error('Error exporting routine:', err);
      throw err;
    }
  };

  const getSemesters = async () => {
    try {
      return await getAllSemestersService();
    } catch (err: any) {
      console.error('Error getting semesters:', err);
      throw err;
    }
  };

  const getRoutinesBySemester = async (semester: string) => {
    try {
      return await getRoutinesBySemesterService(semester);
    } catch (err: any) {
      console.error(`Error getting routines for semester ${semester}:`, err);
      throw err;
    }
  };

  return {
    routines,
    loading,
    error,
    createRoutine: handleCreateRoutine,
    updateRoutine: handleUpdateRoutine,
    deleteRoutine: handleDeleteRoutine,
    refreshRoutines,
    activateRoutine,
    deactivateRoutine,
    addRoutineSlot: handleAddRoutineSlot,
    updateRoutineSlot: handleUpdateRoutineSlot,
    deleteRoutineSlot: handleDeleteRoutineSlot,
    bulkImportSlots,
    exportRoutine,
    getSemesters,
    getRoutinesBySemester
  };
}