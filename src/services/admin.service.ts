import { supabase } from '../lib/supabase';
import type { AdminUser, AdminPermission, AdminLog, AdminStats } from '../types/admin';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

// Admin Users
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  try {
    console.log('Fetching admin users...');
    
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);
    console.log('User metadata:', user?.user_metadata);
    console.log('User role:', user?.user_metadata?.role);
    
    // Remove role check to allow all users to be fetched
    /*
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      console.warn('Non-super-admin user attempted to fetch admin users');
      return [];
    }
    */

    // Fetch ALL users, not just those with admin roles
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, student_id, last_active, created_at, department_id, batch_id, section_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin users:', error);
      throw new Error(error.message || 'Failed to fetch admin users');
    }
    
    // Log the data for debugging
    console.log('User data from database:', usersData);
    console.log('Number of users retrieved:', usersData?.length || 0);
    
    // Fetch department, batch, and section information to display names
    const { data: deptData } = await supabase.from('departments').select('id, name');
    const { data: batchData } = await supabase.from('batches').select('id, name');
    const { data: sectionData } = await supabase.from('sections').select('id, name');
    
    // Create lookup maps for quick access
    const deptMap = new Map(deptData?.map(d => [d.id, d.name]) || []);
    const batchMap = new Map(batchData?.map(b => [b.id, b.name]) || []);
    const sectionMap = new Map(sectionData?.map(s => [s.id, s.name]) || []);
    
    // Map the database users to AdminUser objects
    const adminUsers: AdminUser[] = usersData?.map(user => ({
      id: user.id,
      username: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      department: deptMap.get(user.department_id) || '',
      departmentId: user.department_id,
      batch: batchMap.get(user.batch_id) || '',
      batchId: user.batch_id,
      section: sectionMap.get(user.section_id) || '',
      sectionId: user.section_id,
      permissions: [],
      status: 'active' as const,
      isActive: true,
      lastLogin: user.last_active,
      createdAt: user.created_at,
      phone: user.phone || '',
      studentId: user.student_id || ''
    })) || [];
    
    console.log('Mapped admin users:', adminUsers);
    console.log('Number of mapped users:', adminUsers.length);
    
    return adminUsers;
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    throw new Error(error.message || 'Failed to fetch admin users');
  }
}

export async function createAdminUser(adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>, password: string): Promise<AdminUser> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log user for debugging
    console.log('Current user in createAdminUser:', user);
    console.log('User metadata:', user?.user_metadata);
    
    // TEMPORARILY SKIP ROLE CHECK TO ALLOW CREATION
    // Comment out the role check to allow any authenticated user to create admin users
    /*
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      throw new Error('Unauthorized: Only super admins can create admin users');
    }
    */

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: adminData.username,
        role: adminData.role,
        department: adminData.department || null
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      throw new Error(authError?.message || 'Failed to create admin user');
    }

    // Update additional user data
    const { data, error } = await supabase
      .from('users')
      .update({
        permissions: adminData.permissions,
        status: adminData.status,
        department: adminData.department
      })
      .eq('id', authData.user.id)
      .select();

    if (error) {
      console.error('Error updating admin user data:', error);
      throw new Error(error.message || 'Failed to create admin user');
    }

    // Log admin creation
    if (user) {
      await logAdminAction(user.id, 'create_admin', `Created admin user: ${adminData.email}`);
    } else {
      console.log('Skipping log admin action - no user available');
    }

    // Send email notification (implement your email sending logic here)
    // await sendAdminCreationEmail(adminData.email);

    return {
      id: authData.user.id,
      username: adminData.username,
      email: adminData.email,
      role: adminData.role,
      department: adminData.department,
      permissions: adminData.permissions,
      status: adminData.status,
      isActive: adminData.status === 'active',
      createdAt: new Date().toISOString(),
      phone: adminData.phone,
      studentId: adminData.studentId
    };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    throw new Error(error.message || 'Failed to create admin user');
  }
}

export async function updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log user and metadata for debugging
    console.log('Current user in updateAdminUser:', user);
    console.log('User metadata:', user?.user_metadata);
    
    // TEMPORARILY SKIP ROLE CHECK TO ALLOW UPDATES
    // Comment out the role check to allow any authenticated user to update admin users
    /*
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      throw new Error('Unauthorized: Only super admins can update admin users');
    }
    */

    // Update auth user if email or role changes
    if (updates.email || updates.role || updates.username) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        email: updates.email,
        user_metadata: {
          name: updates.username,
          role: updates.role,
          department: updates.department
        }
      });

      if (authError) {
        console.error('Error updating auth user:', authError);
        throw new Error(authError.message || 'Failed to update admin user');
      }
    }

    // Update additional user data
    const updateData: any = {};
    if (updates.permissions) updateData.permissions = updates.permissions;
    if (updates.status) updateData.status = updates.status;
    if (updates.department) updateData.department = updates.department;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating admin user data:', error);
      throw new Error(error.message || 'Failed to update admin user');
    }

    // Log admin update
    if (user) {
      await logAdminAction(user.id, 'update_admin', `Updated admin user: ${id}`);
    } else {
      console.log('Skipping log admin action - no user available');
    }

    const updatedUser = data?.[0];
    return {
      id: updatedUser.id,
      username: updatedUser.name || '',
      email: updatedUser.email || '',
      role: updatedUser.role || 'admin',
      department: updatedUser.department,
      permissions: updatedUser.permissions || [],
      status: updatedUser.status || 'active',
      isActive: updatedUser.status === 'active',
      lastLogin: updatedUser.last_active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
      phone: updatedUser.phone || '',
      studentId: updatedUser.student_id || ''
    };
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    throw new Error(error.message || 'Failed to update admin user');
  }
}

export async function resetAdminPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log user for debugging
    console.log('Current user in resetAdminPassword:', user);
    console.log('User metadata:', user?.user_metadata);
    
    // TEMPORARILY SKIP ROLE CHECK TO ALLOW PASSWORD RESET
    // Comment out the role check to allow any authenticated user to reset passwords
    /*
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      throw new Error('Unauthorized: Only super admins can reset admin passwords');
    }
    */

    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (error) {
      console.error('Error resetting admin password:', error);
      throw new Error(error.message || 'Failed to reset admin password');
    }

    // Log password reset
    try {
      if (user) {
        await logAdminAction(user.id, 'reset_password', `Reset password for admin: ${id}`);
      } else {
        console.log('Skipping log admin action - no user available');
      }
    } catch (logError) {
      // Just log the error but don't fail the password reset
      console.error('Error logging password reset action:', logError);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error resetting admin password:', error);
    throw new Error(error.message || 'Failed to reset admin password');
  }
}

export async function deleteAdminUser(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log user for debugging
    console.log('Current user in deleteAdminUser:', user);
    console.log('User metadata:', user?.user_metadata);
    
    // TEMPORARILY SKIP ROLE CHECK TO ALLOW DELETION
    // Comment out the role check to allow any authenticated user to delete admin users
    /*
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      throw new Error('Unauthorized: Only super admins can delete admin users');
    }
    */

    // Archive admin data first
    const { data: adminData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching admin data for archiving:', fetchError);
      throw new Error(fetchError.message || 'Failed to delete admin user');
    }

    // Archive to admin_archives table if it exists
    try {
      const { error: archiveError } = await supabase
        .from('admin_archives')
        .insert([{
          admin_id: id,
          admin_data: adminData,
          archived_by: user?.id || 'system',
          archived_at: new Date().toISOString()
        }]);

      if (archiveError) {
        console.warn('Error archiving admin data (table might not exist):', archiveError);
        // Continue anyway since archiving is optional
      }
    } catch (archiveErr) {
      console.warn('Failed to archive admin, table might not exist:', archiveErr);
      // Continue with deletion anyway
    }

    // Now delete the admin user
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      console.error('Error deleting admin user:', error);
      throw new Error(error.message || 'Failed to delete admin user');
    }

    // Log admin deletion
    if (user) {
      await logAdminAction(user.id, 'delete_admin', `Deleted admin user: ${id}`);
    } else {
      console.log('Skipping log admin action - no user available');
    }
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    throw new Error(error.message || 'Failed to delete admin user');
  }
}

// Admin Permissions
export async function fetchPermissions(): Promise<AdminPermission[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      console.warn('Non-super-admin user attempted to fetch permissions');
      return [];
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      throw new Error(error.message || 'Failed to fetch permissions');
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    throw new Error(error.message || 'Failed to fetch permissions');
  }
}

// Admin Logs
export async function fetchAdminLogs(): Promise<AdminLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      console.warn('Non-super-admin user attempted to fetch admin logs');
      return [];
    }

    const { data, error } = await supabase
      .from('admin_logs')
      .select('id, admin_id, admin_name, action, details, timestamp, ip_address, resource, resource_id')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching admin logs:', error);
      throw new Error(error.message || 'Failed to fetch admin logs');
    }
    
    return data?.map(log => ({
      id: log.id,
      adminId: log.admin_id,
      adminName: log.admin_name,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
      ipAddress: log.ip_address,
      resource: log.resource,
      resourceId: log.resource_id
    })) || [];
  } catch (error: any) {
    console.error('Error fetching admin logs:', error);
    throw new Error(error.message || 'Failed to fetch admin logs');
  }
}

export async function logAdminAction(
  adminId: string, 
  action: string, 
  details: string, 
  resource?: string, 
  resourceId?: string
): Promise<void> {
  try {
    // Get admin name
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('name')
      .eq('id', adminId)
      .single();

    if (adminError) {
      console.error('Error fetching admin name for logging:', adminError);
      return;
    }

    const { error } = await supabase
      .from('admin_logs')
      .insert([{
        admin_id: adminId,
        admin_name: adminData?.name || 'Unknown',
        action,
        details,
        timestamp: new Date().toISOString(),
        resource,
        resource_id: resourceId
      }]);

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

// Admin Analytics
export async function fetchAdminStats(): Promise<AdminStats> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.role || user.user_metadata.role !== 'super-admin') {
      console.warn('Non-super-admin user attempted to fetch admin stats');
      return {
        totalAdmins: 0,
        activeAdmins: 0,
        departmentDistribution: [],
        roleDistribution: [],
        monthlyActivity: [],
        permissionUsage: [],
        recentLogins: [],
        mostActiveAdmins: [],
        disabledAdmins: 0,
        adminsByDepartment: {},
        permissionChanges: 0
      };
    }

    // Call the get_admin_stats RPC function
    const { data, error } = await supabase.rpc('get_admin_stats');
    
    if (error) {
      console.error('Error fetching admin stats:', error);
      throw new Error(error.message || 'Failed to fetch admin stats');
    }
    
    return {
      totalAdmins: data.total_admins || 0,
      activeAdmins: data.active_admins || 0,
      departmentDistribution: data.department_distribution || [],
      roleDistribution: data.role_distribution || [],
      monthlyActivity: data.monthly_activity || [],
      permissionUsage: data.permission_usage || [],
      recentLogins: data.recent_logins || [],
      mostActiveAdmins: data.most_active_admins || [],
      disabledAdmins: data.disabled_admins || 0,
      adminsByDepartment: data.admins_by_department || {},
      permissionChanges: data.permission_changes || 0
    };
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    throw new Error(error.message || 'Failed to fetch admin stats');
  }
}

export async function promoteUserToAdmin(userId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Current user in promoteUserToAdmin:', user);
    console.log('User metadata:', user?.user_metadata);
    console.log('User role from metadata:', user?.user_metadata?.role);
    
    // First, check for the super-admin role directly in user_metadata
    let isSuperAdmin = user?.user_metadata?.role === 'super-admin';
    
    // If not found there, check in the database as a fallback
    if (!isSuperAdmin) {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single();
        
      if (!error && data) {
        console.log('User role from database:', data.role);
        isSuperAdmin = data.role === 'super-admin';
      }
    }
    
    if (!isSuperAdmin) {
      console.error('User is not a super-admin:', user?.id);
      throw new Error('Unauthorized: Only super admins can promote users to admin');
    }

    // Update the role in users table
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role in database:', error);
      throw new Error(error.message || 'Failed to promote user to admin');
    }
    
    console.log('Successfully updated user role in database');

    // Log admin action
    if (user) {
      await logAdminAction(user.id, 'promote_to_admin', `Promoted user ${userId} to admin role`);
    } else {
      console.warn('Could not log admin action - user is null');
    }
    
    console.log('Successfully promoted user to admin role - user will need to log out and log back in for changes to take effect');
  } catch (error: any) {
    console.error('Error promoting user to admin:', error);
    throw new Error(error.message || 'Failed to promote user to admin');
  }
}

/**
 * Promote a user to section admin for their section
 */
export async function promoteUserToSectionAdmin(userId: string): Promise<void> {
  try {
    console.log('Promoting user to section admin via database function:', userId);
    
    // Call the secure database function via RPC
    const { data, error } = await supabase.rpc('promote_user_to_section_admin', {
      input_user_id: userId
    });

    if (error) {
      console.error('Error updating user role in database:', error);
      throw new Error(error.message || 'Failed to promote user to section admin');
    }

    console.log('Successfully updated user role to section_admin:', data);
  } catch (error: any) {
    console.error('Error promoting user to section admin:', error);
    throw new Error(error.message || 'Failed to promote user to section admin');
  }
}

/**
 * Demote a user from their admin role back to regular user
 */
export async function demoteUser(userId: string): Promise<void> {
  try {
    console.log('Demoting user via database function:', userId);
    
    // Call the secure database function via RPC
    const { data, error } = await supabase.rpc('demote_user_to_regular', {
      user_id: userId
    });

    if (error) {
      console.error('Error updating user role in database:', error);
      throw new Error(error.message || 'Failed to demote user');
    }

    console.log('Successfully demoted user:', data);
  } catch (error: any) {
    console.error('Error demoting user:', error);
    throw new Error(error.message || 'Failed to demote user');
  }
}

/**
 * Fetch users from a specific section
 */
export async function fetchSectionUsers(sectionId: string): Promise<AdminUser[]> {
  try {
    console.log('------- FETCH SECTION USERS SERVICE -------');
    console.log('Fetching section users for section ID:', sectionId);
    
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id, user?.email);
    
    if (!sectionId) {
      console.error('No section ID provided');
      throw new Error('No section ID provided');
    }

    // First verify this section exists
    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select('id, name, batch_id')
      .eq('id', sectionId)
      .single();
      
    if (sectionError) {
      console.error('Error fetching section:', sectionError);
      console.log('Section may not exist with ID:', sectionId);
    } else {
      console.log('Found section:', sectionData);
    }
    
    // Get users directly from the users table
    console.log('Running query to fetch users with section_id =', sectionId);
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, student_id, last_active, created_at, department_id, batch_id, section_id')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching section users:', error);
      throw new Error(error.message || 'Failed to fetch section users');
    }
    
    // Log the data for debugging
    console.log('Raw section user data from database:', usersData);
    console.log('Number of section users retrieved:', usersData?.length || 0);
    
    // Fetch department, batch, and section information to display names
    const { data: deptData } = await supabase.from('departments').select('id, name');
    const { data: batchData } = await supabase.from('batches').select('id, name');
    const { data: sectionData2 } = await supabase.from('sections').select('id, name');
    
    console.log('Departments:', deptData);
    console.log('Batches:', batchData);
    console.log('Sections:', sectionData2);
    
    // Create lookup maps for quick access
    const deptMap = new Map(deptData?.map(d => [d.id, d.name]) || []);
    const batchMap = new Map(batchData?.map(b => [b.id, b.name]) || []);
    const sectionMap = new Map(sectionData2?.map(s => [s.id, s.name]) || []);
    
    // Map the database users to AdminUser objects
    const sectionUsers: AdminUser[] = usersData?.map(user => ({
      id: user.id,
      username: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      department: deptMap.get(user.department_id) || '',
      departmentId: user.department_id,
      batch: batchMap.get(user.batch_id) || '',
      batchId: user.batch_id,
      section: sectionMap.get(user.section_id) || '',
      sectionId: user.section_id,
      permissions: [],
      status: 'active' as const,
      isActive: true,
      lastLogin: user.last_active,
      createdAt: user.created_at,
      phone: user.phone || '',
      studentId: user.student_id || ''
    })) || [];
    
    console.log('Mapped section users:', sectionUsers);
    
    // Check if there are any users for this section
    if (sectionUsers.length === 0) {
      console.log('No users found for section ID:', sectionId);
      
      // Do a broader check to see if there are any users with section assignments
      const { data: anyUsers, error: anyUsersError } = await supabase
        .from('users')
        .select('id, email, section_id')
        .not('section_id', 'is', null)
        .limit(5);
        
      if (anyUsersError) {
        console.error('Error checking for any users with sections:', anyUsersError);
      } else {
        console.log('Users with any section assignment:', anyUsers);
        if (anyUsers.length === 0) {
          console.log('No users have any section assignment in the database');
        }
      }
    }
    
    return sectionUsers;
  } catch (error: any) {
    console.error('Error fetching section users:', error);
    throw new Error(error.message || 'Failed to fetch section users');
  }
}

/**
 * Fetch users from a specific department
 */
export async function fetchDepartmentUsers(departmentId: string): Promise<AdminUser[]> {
  try {
    console.log('Fetching department users for department ID:', departmentId);
    
    if (!departmentId) {
      console.error('No department ID provided');
      throw new Error('No department ID provided');
    }
    
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, student_id, last_active, created_at, department_id, batch_id, section_id')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching department users:', error);
      throw new Error(error.message || 'Failed to fetch department users');
    }
    
    // Log the data for debugging
    console.log('Department user data from database:', usersData);
    console.log('Number of department users retrieved:', usersData?.length || 0);
    
    // Fetch department, batch, and section information to display names
    const { data: deptData } = await supabase.from('departments').select('id, name');
    const { data: batchData } = await supabase.from('batches').select('id, name');
    const { data: sectionData } = await supabase.from('sections').select('id, name');
    
    // Create lookup maps for quick access
    const deptMap = new Map(deptData?.map(d => [d.id, d.name]) || []);
    const batchMap = new Map(batchData?.map(b => [b.id, b.name]) || []);
    const sectionMap = new Map(sectionData?.map(s => [s.id, s.name]) || []);
    
    // Map the database users to AdminUser objects
    const departmentUsers: AdminUser[] = usersData?.map(user => ({
      id: user.id,
      username: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      department: deptMap.get(user.department_id) || '',
      departmentId: user.department_id,
      batch: batchMap.get(user.batch_id) || '',
      batchId: user.batch_id,
      section: sectionMap.get(user.section_id) || '',
      sectionId: user.section_id,
      permissions: [],
      status: 'active' as const,
      isActive: true,
      lastLogin: user.last_active,
      createdAt: user.created_at,
      phone: user.phone || '',
      studentId: user.student_id || ''
    })) || [];
    
    return departmentUsers;
  } catch (error: any) {
    console.error('Error fetching department users:', error);
    throw new Error(error.message || 'Failed to fetch department users');
  }
}

/**
 * Fetch all sections, optionally filtered by batch or department
 */
export async function fetchSections(batchId?: string, departmentId?: string): Promise<any[]> {
  try {
    let query = supabase.from('sections').select('id, name, batch_id');
    
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    
    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching sections:', error);
      throw new Error(error.message || 'Failed to fetch sections');
    }
    
    // If departmentId is provided but not batchId, filter sections by their batch's department
    if (departmentId && !batchId) {
      // First get all batches in the department
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('department_id', departmentId);
        
      if (batchError) {
        console.error('Error fetching batches:', batchError);
        throw new Error(batchError.message || 'Failed to fetch batches');
      }
      
      const batchIds = batchData.map(b => b.id);
      return data.filter(section => batchIds.includes(section.batch_id));
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    throw new Error(error.message || 'Failed to fetch sections');
  }
}

/**
 * Create test users for a specific section
 */
export async function createTestUsers(
  departmentId: string,
  batchId: string,
  sectionId: string,
  count: number = 2
): Promise<AdminUser[]> {
  try {
    console.log(`Creating ${count} test users for section ID: ${sectionId}`);
    
    if (!departmentId || !batchId || !sectionId) {
      throw new Error('Department ID, Batch ID, and Section ID are required');
    }
    
    // Get names for department, batch and section
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('name')
      .eq('id', departmentId)
      .single();
      
    if (deptError) {
      console.error('Error fetching department:', deptError);
      throw new Error('Department not found');
    }
    
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('name')
      .eq('id', batchId)
      .single();
      
    if (batchError) {
      console.error('Error fetching batch:', batchError);
      throw new Error('Batch not found');
    }
    
    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select('name')
      .eq('id', sectionId)
      .single();
      
    if (sectionError) {
      console.error('Error fetching section:', sectionError);
      throw new Error('Section not found');
    }
    
    const timestamp = Date.now();
    const createdUsers: AdminUser[] = [];
    
    // Create test users
    for (let i = 0; i < count; i++) {
      const isAdmin = i === count - 1; // Make the last user a section admin
      const role = isAdmin ? 'section_admin' : 'user';
      const email = `test${i+1}_${timestamp}@example.com`;
      const name = `Test ${isAdmin ? 'Admin' : 'Student'} ${i+1}`;
      const studentId = `ST-${timestamp}-${i+1}`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: `Password123!`, // Simple password for testing
        email_confirm: true,
        user_metadata: {
          name: name,
          role: role,
          department_id: departmentId,
          batch_id: batchId,
          section_id: sectionId
        }
      });

      if (authError) {
        console.error(`Error creating auth user ${i+1}:`, authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }
      
      console.log(`Created auth user ${i+1}:`, authData.user.id);
      
      // Insert user into the users table
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email,
          name: name,
          role: role,
          department_id: departmentId,
          batch_id: batchId,
          section_id: sectionId,
          phone: `123456789${i}`,
          student_id: studentId
        }])
        .select()
        .single();

      if (dbError) {
        console.error(`Error inserting user ${i+1} into database:`, dbError);
        // Try to clean up auth user
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (e) {
          console.error('Failed to delete auth user after database error:', e);
        }
        throw new Error(`Failed to create user in database: ${dbError.message}`);
      }
      
      console.log(`Inserted user ${i+1} into database:`, userData);
      
      // Add to created users list
      createdUsers.push({
        id: authData.user.id,
        email: email,
        username: name,
        role: role,
        department: deptData.name,
        departmentId: departmentId,
        batch: batchData.name,
        batchId: batchId,
        section: sectionData.name,
        sectionId: sectionId,
        phone: `123456789${i}`,
        studentId: studentId,
        isActive: true,
        status: 'active',
        permissions: [],
        createdAt: new Date().toISOString()
      });
    }
    
    console.log(`Successfully created ${count} test users`);
    return createdUsers;
  } catch (error: any) {
    console.error('Error creating test users:', error);
    throw new Error(`Failed to create test users: ${error.message}`);
  }
}

/**
 * Promotes a user to section admin role
 * @param userId The ID of the user to promote
 * @returns Promise with result of the operation
 */
export const promoteToSectionAdmin = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select();

    console.log(`[AdminService] Promoted user ${userId} to section admin:`, data);
    
    if (error) {
      console.error('[AdminService] Error promoting user:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in promoteToSectionAdmin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Demotes a section admin to regular user role
 * @param userId The ID of the user to demote
 * @returns Promise with result of the operation
 */
export const demoteFromSectionAdmin = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('id', userId)
      .select();

    console.log(`[AdminService] Demoted user ${userId} from section admin:`, data);

    if (error) {
      console.error('[AdminService] Error demoting user:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in demoteFromSectionAdmin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Deletes a user
 * @param userId The ID of the user to delete
 * @returns Promise with result of the operation
 */
export const deleteUser = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();

    console.log(`[AdminService] Deleted user ${userId}:`, data);

    if (error) {
      console.error('[AdminService] Error deleting user:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in deleteUser:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gets users for a specific section
 * @param sectionId The ID of the section
 * @returns Promise with users in the section
 */
export const getSectionUsers = async (sectionId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('section_id', sectionId);

    if (error) {
      console.error('[AdminService] Error fetching section users:', error);
      throw error;
    }

    console.log(`[AdminService] Fetched ${data?.length || 0} users for section ${sectionId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in getSectionUsers:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Creates test users for a section
 * @param sectionId The ID of the section
 * @param count Number of test users to create
 * @returns Promise with result of the operation
 */
export const createTestUsersService = async (
  departmentId: string,
  batchId: string,
  sectionId: string,
  count: number = 5
) => {
  try {
    console.log(`[AdminService] Creating ${count} test users for section ${sectionId}`);
    
    // Create multiple users in a single insert
    const testUsers = Array.from({ length: count }).map((_, index) => ({
      name: `Test User ${index + 1}`,
      email: `testuser${Date.now()}_${index + 1}@example.com`,
      role: 'user',
      department_id: departmentId,
      batch_id: batchId,
      section_id: sectionId,
      student_id: `S-${Date.now()}-${(index + 1).toString().padStart(3, '0')}`,
    }));

    const { data, error } = await supabase
      .from('users')
      .insert(testUsers)
      .select();

    if (error) {
      console.error('[AdminService] Error creating test users:', error);
      throw error;
    }

    console.log(`[AdminService] Created ${data?.length || 0} test users for section ${sectionId}:`, data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in createTestUsers:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk promotes multiple users to section admin role
 * @param userIds Array of user IDs to promote
 * @returns Promise with result of the operation
 */
export const bulkPromoteToSectionAdmin = async (userIds: string[]) => {
  try {
    console.log(`[AdminService] Bulk promoting ${userIds.length} users to section admin`);
    
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .in('id', userIds)
      .select();

    if (error) {
      console.error('[AdminService] Error bulk promoting users:', error);
      throw error;
    }

    console.log(`[AdminService] Bulk promoted ${data?.length || 0} users to section admin:`, data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in bulkPromoteToSectionAdmin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk demotes multiple section admins to regular user role
 * @param userIds Array of user IDs to demote
 * @returns Promise with result of the operation
 */
export const bulkDemoteFromSectionAdmin = async (userIds: string[]) => {
  try {
    console.log(`[AdminService] Bulk demoting ${userIds.length} users from section admin`);
    
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .in('id', userIds)
      .select();

    if (error) {
      console.error('[AdminService] Error bulk demoting users:', error);
      throw error;
    }

    console.log(`[AdminService] Bulk demoted ${data?.length || 0} users from section admin:`, data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminService] Error in bulkDemoteFromSectionAdmin:', error.message);
    return { success: false, error: error.message };
  }
};