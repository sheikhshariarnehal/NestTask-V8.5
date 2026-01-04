import { supabase } from '../lib/supabase';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin' | 'section_admin' | 'super-admin';
  phone: string | null;
  student_id: string | null;
  department_id: string | null;
  batch_id: string | null;
  section_id: string | null;
  created_at: string;
  last_active: string | null;
}

export interface Department {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  name: string;
  department_id: string;
}

export interface Section {
  id: string;
  name: string;
  batch_id: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin' | 'section_admin' | 'super-admin';
  phone?: string;
  student_id?: string;
  department_id?: string;
  batch_id?: string;
  section_id?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: 'user' | 'admin' | 'section_admin' | 'super-admin';
  phone?: string;
  student_id?: string;
  department_id?: string;
  batch_id?: string;
  section_id?: string;
}

/**
 * Fetch all users with optional filtering (for super admin)
 */
export async function fetchAllUsers(): Promise<UserRecord[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchAllUsers:', error);
    throw error;
  }
}

/**
 * Fetch all departments
 */
export async function fetchDepartments(): Promise<Department[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchDepartments:', error);
    throw error;
  }
}

/**
 * Fetch batches, optionally filtered by department
 */
export async function fetchBatches(departmentId?: string): Promise<Batch[]> {
  try {
    let query = supabase.from('batches').select('*').order('name');
    
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchBatches:', error);
    throw error;
  }
}

/**
 * Fetch sections, optionally filtered by batch
 */
export async function fetchSections(batchId?: string): Promise<Section[]> {
  try {
    let query = supabase.from('sections').select('*').order('name');
    
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sections:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchSections:', error);
    throw error;
  }
}

/**
 * Create a new user (super admin only)
 */
export async function createUser(userData: CreateUserData): Promise<UserRecord> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('You must be logged in to create users');
    }

    // First create the auth user using admin API through an edge function or directly
    // For now, we'll use signUp and then update the user record
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
        }
      }
    });

    if (signUpError) {
      console.error('Error creating auth user:', signUpError);
      throw new Error(signUpError.message);
    }

    if (!signUpData.user) {
      throw new Error('Failed to create user account');
    }

    // Update the public users table with additional data
    const { data: userRecord, error: updateError } = await supabase
      .from('users')
      .upsert({
        id: signUpData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone || null,
        student_id: userData.student_id || null,
        department_id: userData.department_id || null,
        batch_id: userData.batch_id || null,
        section_id: userData.section_id || null,
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user record:', updateError);
      throw new Error(updateError.message);
    }

    // Log the activity
    await supabase.from('activities').insert({
      type: 'user_created',
      title: `New user created: ${userData.name}`,
      user_id: authData.user.id,
      metadata: { 
        target_user_id: signUpData.user.id, 
        email: userData.email,
        role: userData.role 
      }
    });

    return userRecord;
  } catch (error: any) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, userData: UpdateUserData): Promise<UserRecord> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('You must be logged in to update users');
    }

    // Get current user data for activity log
    const { data: currentUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('users')
      .update({
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        student_id: userData.student_id,
        department_id: userData.department_id,
        batch_id: userData.batch_id,
        section_id: userData.section_id,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message);
    }

    // If role changed to section_admin, add to section_admins table
    if (userData.role === 'section_admin' && userData.section_id && currentUser?.role !== 'section_admin') {
      await supabase.from('section_admins').upsert({
        user_id: userId,
        section_id: userData.section_id,
        assigned_by: authData.user.id,
      });
    }

    // If role changed from section_admin, remove from section_admins table
    if (currentUser?.role === 'section_admin' && userData.role !== 'section_admin') {
      await supabase.from('section_admins').delete().eq('user_id', userId);
    }

    // Log the activity
    await supabase.from('activities').insert({
      type: 'user_updated',
      title: `User updated: ${data.name}`,
      user_id: authData.user.id,
      metadata: { 
        target_user_id: userId,
        changes: userData,
        previous: currentUser
      }
    });

    return data;
  } catch (error: any) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

/**
 * Delete a user (super admin only)
 */
export async function deleteUserById(userId: string): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('You must be logged in to delete users');
    }

    // Get user info before deletion for logging
    const { data: userToDelete } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Remove from section_admins if applicable
    await supabase.from('section_admins').delete().eq('user_id', userId);

    // Delete from users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message);
    }

    // Log the activity
    await supabase.from('activities').insert({
      type: 'user_deleted',
      title: `User deleted: ${userToDelete?.name || userToDelete?.email}`,
      user_id: authData.user.id,
      metadata: { 
        deleted_user: userToDelete
      }
    });
  } catch (error: any) {
    console.error('Error in deleteUserById:', error);
    throw error;
  }
}

/**
 * Change user role
 */
export async function changeUserRole(
  userId: string, 
  newRole: 'user' | 'admin' | 'section_admin' | 'super-admin',
  sectionId?: string
): Promise<UserRecord> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('You must be logged in to change user roles');
    }

    // Get current user data
    const { data: currentUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Update the role
    const updateData: any = { role: newRole };
    if (sectionId) {
      updateData.section_id = sectionId;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error changing user role:', error);
      throw new Error(error.message);
    }

    // Handle section_admin table updates
    if (newRole === 'section_admin' && sectionId) {
      // Remove any existing section admin entries
      await supabase.from('section_admins').delete().eq('user_id', userId);
      
      // Add new section admin entry
      await supabase.from('section_admins').insert({
        user_id: userId,
        section_id: sectionId,
        assigned_by: authData.user.id,
      });
    } else if (currentUser?.role === 'section_admin' && newRole !== 'section_admin') {
      // Remove from section_admins if demoting from section_admin
      await supabase.from('section_admins').delete().eq('user_id', userId);
    }

    // Log the activity
    await supabase.from('activities').insert({
      type: 'role_change',
      title: `User role changed: ${currentUser?.role} → ${newRole}`,
      user_id: authData.user.id,
      metadata: { 
        target_user_id: userId,
        previous_role: currentUser?.role,
        new_role: newRole,
        section_id: sectionId
      }
    });

    return data;
  } catch (error: any) {
    console.error('Error in changeUserRole:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export function getUserStats(users: UserRecord[]) {
  const totalUsers = users.length;
  const superAdmins = users.filter(u => u.role === 'super-admin').length;
  const admins = users.filter(u => u.role === 'admin').length;
  const sectionAdmins = users.filter(u => u.role === 'section_admin').length;
  const regularUsers = users.filter(u => u.role === 'user').length;

  // Calculate active users (active in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeUsers = users.filter(u => 
    u.last_active && new Date(u.last_active) > sevenDaysAgo
  ).length;

  // New users this week
  const newUsersThisWeek = users.filter(u =>
    u.created_at && new Date(u.created_at) > sevenDaysAgo
  ).length;

  return {
    totalUsers,
    superAdmins,
    admins,
    sectionAdmins,
    regularUsers,
    activeUsers,
    newUsersThisWeek
  };
}

/**
 * Search users by name or email
 */
export function searchUsers(users: UserRecord[], searchTerm: string): UserRecord[] {
  if (!searchTerm) return users;
  
  const term = searchTerm.toLowerCase();
  return users.filter(user =>
    user.name?.toLowerCase().includes(term) ||
    user.email?.toLowerCase().includes(term) ||
    user.student_id?.toLowerCase().includes(term) ||
    user.phone?.toLowerCase().includes(term)
  );
}

/**
 * Filter users by role
 */
export function filterUsersByRole(users: UserRecord[], role: string): UserRecord[] {
  if (role === 'all') return users;
  return users.filter(user => user.role === role);
}
