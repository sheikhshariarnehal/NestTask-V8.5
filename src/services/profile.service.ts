import { supabase } from '../lib/supabase';
import type { User } from '../types/auth';

/**
 * Upload profile photo to Supabase Storage
 * @param userId - The user's ID
 * @param file - The image file to upload
 * @returns The public URL of the uploaded photo
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit.');
    }

    // Create unique filename with timestamp
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    // Delete old profile photos for this user first
    const { data: existingFiles } = await supabase.storage
      .from('profile-photos')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(file => `${userId}/${file.name}`);
      await supabase.storage
        .from('profile-photos')
        .remove(filesToDelete);
    }

    // Upload new file
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload profile photo: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

/**
 * Delete profile photo from storage
 * @param userId - The user's ID
 */
export async function deleteProfilePhoto(userId: string): Promise<void> {
  try {
    // List all files for this user
    const { data: files, error: listError } = await supabase.storage
      .from('profile-photos')
      .list(userId);

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (files && files.length > 0) {
      // Delete all files
      const filesToDelete = files.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('profile-photos')
        .remove(filesToDelete);

      if (deleteError) {
        throw new Error(`Failed to delete files: ${deleteError.message}`);
      }
    }

    // Update user record to remove avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: null })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user record: ${updateError.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting profile photo:', error);
    throw error;
  }
}

/**
 * Update user profile information
 * @param userId - The user's ID
 * @param updates - Profile fields to update
 * @returns Updated user data
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    phone?: string;
    studentId?: string;
    avatar?: string | null;
  }
): Promise<User> {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.studentId !== undefined) updateData.student_id = updates.studentId;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

    // Update user record
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        email,
        name,
        phone,
        student_id,
        role,
        created_at,
        last_active,
        avatar,
        department_id,
        batch_id,
        section_id
      `)
      .single();

    if (error) {
      console.error('Update error:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // Transform database response to User type
    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      studentId: data.student_id,
      role: data.role,
      createdAt: data.created_at,
      lastActive: data.last_active,
      avatar: data.avatar,
      departmentId: data.department_id,
      batchId: data.batch_id,
      sectionId: data.section_id
    };

    return user;
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get user profile by ID
 * @param userId - The user's ID
 * @returns User profile data
 */
export async function getUserProfile(userId: string): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        phone,
        student_id,
        role,
        created_at,
        last_active,
        avatar,
        department_id,
        batch_id,
        section_id,
        departments:department_id(name),
        batches:batch_id(name),
        sections:section_id(name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    // Transform database response to User type
    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      studentId: data.student_id,
      role: data.role,
      createdAt: data.created_at,
      lastActive: data.last_active,
      avatar: data.avatar,
      departmentId: data.department_id,
      batchId: data.batch_id,
      sectionId: data.section_id,
      departmentName: Array.isArray(data.departments) ? data.departments[0]?.name : (data.departments as any)?.name,
      batchName: Array.isArray(data.batches) ? data.batches[0]?.name : (data.batches as any)?.name,
      sectionName: Array.isArray(data.sections) ? data.sections[0]?.name : (data.sections as any)?.name
    };

    return user;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Change user password
 * @param newPassword - The new password
 */
export async function changePassword(newPassword: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error changing password:', error);
    throw error;
  }
}
