import { supabase, getCachedUser } from '../lib/supabase';
import type { User } from '../types/auth';
import type { UserStats } from '../types/user';
import { mapDbUserToUser } from './auth.service';
import { deduplicate, requestKeys } from '../lib/requestDeduplicator';

// Cache for user role/section data to avoid duplicate API calls
// This cache is short-lived (cleared on page navigation or after 30 seconds)
interface UserRoleCache {
  role: string;
  section_id: string | null;
  timestamp: number;
}
const userRoleCache = new Map<string, UserRoleCache>();
const USER_ROLE_CACHE_TTL = 30000; // 30 seconds

/**
 * Get current user's role and section with caching and deduplication.
 * This eliminates duplicate "users?select=role,section_id" calls.
 */
async function getCurrentUserRoleAndSection(userId: string): Promise<{ role: string; section_id: string | null } | null> {
  // Check cache first
  const cached = userRoleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < USER_ROLE_CACHE_TTL) {
    return { role: cached.role, section_id: cached.section_id };
  }

  // Use deduplication to prevent concurrent duplicate requests
  return deduplicate(requestKeys.userRole(userId), async () => {
    const { data, error } = await supabase
      .from('users')
      .select('role, section_id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    // Cache the result
    userRoleCache.set(userId, {
      role: data.role,
      section_id: data.section_id,
      timestamp: Date.now()
    });

    return { role: data.role, section_id: data.section_id };
  });
}

/**
 * Clear the user role cache (call on logout or session change)
 */
export function clearUserRoleCache(): void {
  userRoleCache.clear();
}

export async function fetchUsers(): Promise<User[]> {
  try {
    // Use cached auth user to prevent duplicate auth/v1/user API calls
    const { data: { user } } = await getCachedUser();
    if (!user) {
      console.warn('No authenticated user found');
      return [];
    }

    // Get the current user's section (for filtering) - now with caching and deduplication
    const currentUserData = await getCurrentUserRoleAndSection(user.id);
    
    let query = supabase
      .from('users')
      .select(`
        id, 
        email, 
        name, 
        role, 
        created_at, 
        last_active, 
        phone,
        student_id,
        section_id
      `)
      .order('created_at', { ascending: false });
    
    // If user is not an admin or super-admin, filter by their section
    if (currentUserData?.role !== 'admin' && currentUserData?.role !== 'super-admin' && currentUserData?.section_id) {
      // Filter by section for section admins
      query = query.eq('section_id', currentUserData.section_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    // Get section information separately if needed - now with deduplication
    const sectionIds = [...new Set(data?.filter(user => user.section_id).map(user => user.section_id) || [])];
    let sectionNames: Record<string, string> = {};
    
    if (sectionIds.length > 0) {
      // Use a cache key based on sorted section IDs to deduplicate identical queries
      const cacheKey = `sections:${sectionIds.sort().join(',')}`;
      const { deduplicateWithCache, requestKeys } = await import('../lib/requestDeduplicator');
      
      const sections = await deduplicateWithCache(cacheKey, async () => {
        const { data: sectionsData, error: sectionError } = await supabase
          .from('sections')
          .select('id, name')
          .in('id', sectionIds);
        
        if (sectionError) {
          console.error('Error fetching sections:', sectionError);
          return [];
        }
        return sectionsData || [];
      });
        
      if (sections.length > 0) {
        // Create a map of section IDs to section names
        sectionNames = sections.reduce((acc: Record<string, string>, section: { id: string; name: string }) => {
          acc[section.id] = section.name;
          return acc;
        }, {});
      }
    }
    
    return data?.map(user => ({
      id: user.id,
      email: user.email || '',
      name: user.name || user.email?.split('@')[0] || '',
      role: user.role || 'user',
      createdAt: user.created_at,
      lastActive: user.last_active,
      phone: user.phone || '',
      studentId: user.student_id || '',
      sectionId: user.section_id || '',
      sectionName: user.section_id ? sectionNames[user.section_id] || '' : ''
    })) || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    // Use cached auth user to prevent duplicate API calls
    const { data: { user } } = await getCachedUser();
    if (!user) {
      throw new Error('Unauthorized: You must be logged in');
    }

    // Get the current user's role and section_id - use cached function
    const currentUserData = await getCurrentUserRoleAndSection(user.id);

    if (!currentUserData) {
      console.error('Error fetching user role');
      throw new Error('Failed to get user role');
    }

    // Get the target user's section_id
    const { data: targetUserData, error: targetError } = await supabase
      .from('users')
      .select('section_id')
      .eq('id', userId)
      .single();

    if (targetError) {
      console.error('Error fetching target user:', targetError);
      throw new Error('Failed to get target user information');
    }

    // Helper function to check if user is a section admin
    const isSectionAdmin = (role: string) => role === 'section-admin' || role === 'section_admin';

    // Use different delete functions based on role
    if (isSectionAdmin(currentUserData.role)) {
      // Additional check to ensure users can only delete from their own section
      if (currentUserData.section_id !== targetUserData?.section_id) {
        throw new Error('You can only delete users from your own section');
      }

      console.log('Attempting to delete user as section admin:', {
        userId,
        adminSection: currentUserData.section_id,
        targetSection: targetUserData?.section_id
      });

      // Use section admin delete function
      const { error } = await supabase.rpc('delete_section_user', {
        user_id: userId
      });

      if (error) {
        console.error('Error deleting user as section admin:', error);
        throw new Error(error.message || 'Failed to delete user');
      }
    } else if (currentUserData.role === 'admin' || currentUserData.role === 'super-admin') {
      // Use regular admin delete function
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user as admin:', error);
        throw new Error(error.message || 'Failed to delete user');
      }
    } else {
      throw new Error('Unauthorized: Only administrators can delete users');
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
}

export async function promoteUser(userId: string, newRole: 'admin' | 'section-admin'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: You must be logged in');
    }

    // Get the current user's role
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin' && currentUserData?.role !== 'super-admin') {
      throw new Error('Unauthorized: Only admins can promote users');
    }

    // Update the user's role
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error promoting user:', error);
      throw new Error(error.message || 'Failed to promote user');
    }
  } catch (error: any) {
    console.error('Error promoting user:', error);
    throw new Error(error.message || 'Failed to promote user');
  }
}

export async function demoteUser(userId: string, newRole: 'user'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: You must be logged in');
    }

    // Get the current user's role
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin' && currentUserData?.role !== 'super-admin') {
      throw new Error('Unauthorized: Only admins can demote users');
    }

    // Update the user's role
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error demoting user:', error);
      throw new Error(error.message || 'Failed to demote user');
    }
  } catch (error: any) {
    console.error('Error demoting user:', error);
    throw new Error(error.message || 'Failed to demote user');
  }
}

export async function fetchUserStats(): Promise<UserStats> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        totalUsers: 0,
        activeToday: 0,
        newThisWeek: 0
      };
    }

    // Get the current user's section (for filtering)
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role, section_id')
      .eq('id', user.id)
      .single();

    let query = 'get_user_stats';
    let params = {};

    // If user is not an admin or super-admin, filter by their section
    if (currentUserData?.role !== 'admin' && currentUserData?.role !== 'super-admin' && currentUserData?.section_id) {
      query = 'get_section_user_stats';
      params = { section_id: currentUserData.section_id };
    }

    const { data, error } = await supabase.rpc(query, params);
    
    if (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalUsers: 0,
        activeToday: 0,
        newThisWeek: 0
      };
    }
    
    return {
      totalUsers: data.total_users || 0,
      activeToday: data.active_today || 0,
      newThisWeek: data.new_this_week || 0
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalUsers: 0,
      activeToday: 0,
      newThisWeek: 0
    };
  }
}