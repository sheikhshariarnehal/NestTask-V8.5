import { supabase } from '../lib/supabase';
import { dataCache, cacheKeys } from '../lib/dataCache';
import type { Department, Batch, Section } from '../types/auth';
import type { Database } from '../types/supabase';

type DbDepartment = Database['public']['Tables']['departments']['Row'];
type DbBatch = Database['public']['Tables']['batches']['Row'];
type DbSection = Database['public']['Tables']['sections']['Row'];

/**
 * Fetches all departments with caching
 */
export async function getDepartments(): Promise<Department[]> {
  return dataCache.getOrFetch(
    cacheKeys.departments(),
    async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
        throw new Error('Failed to fetch departments');
      }

      return (data || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        createdAt: dept.created_at
      }));
    },
    10 * 60 * 1000 // 10 minutes cache
  );
}

/**
 * Fetches batches for a specific department with caching
 */
export async function getBatchesByDepartment(departmentId: string): Promise<Batch[]> {
  return dataCache.getOrFetch(
    cacheKeys.batches(departmentId),
    async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('department_id', departmentId)
        .order('name');

      if (error) {
        console.error('Error fetching batches:', error);
        throw new Error('Failed to fetch batches');
      }

      return (data || []).map(batch => ({
        id: batch.id,
        name: batch.name,
        departmentId: batch.department_id,
        createdAt: batch.created_at
      }));
    },
    10 * 60 * 1000 // 10 minutes cache
  );
}

/**
 * Fetches sections for a specific batch with caching
 */
export async function getSectionsByBatch(batchId: string): Promise<Section[]> {
  return dataCache.getOrFetch(
    cacheKeys.sections(batchId),
    async () => {
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('batch_id', batchId)
          .order('name');

        if (error) throw error;

        return (data || []).map(section => ({
          id: section.id,
          name: section.name,
          batchId: section.batch_id,
          createdAt: section.created_at
        }));
      } catch (error) {
        console.error('Error fetching sections:', error);
        throw new Error('Failed to fetch sections');
      }
    },
    10 * 60 * 1000 // 10 minute cache
  );
}

/**
 * Gets section details by ID
 */
export async function getSectionById(sectionId: string): Promise<Section | null> {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('id', sectionId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      batchId: data.batch_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error fetching section:', error);
    return null;
  }
}

/**
 * Gets batch details by ID
 */
export async function getBatchById(batchId: string): Promise<Batch | null> {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      departmentId: data.department_id,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error fetching batch:', error);
    return null;
  }
}

/**
 * Gets department details by ID
 */
export async function getDepartmentById(departmentId: string): Promise<Department | null> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error fetching department:', error);
    return null;
  }
} 