import { supabase } from '../lib/supabase';
import type { Task, NewTask } from '../types/task';

export async function fetchUserRole(userId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.role === 'admin';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return false;
  }
}

export async function fetchTasks(userId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`user_id.eq.${userId},is_admin_task.eq.true`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export async function createTask(userId: string, task: NewTask, isAdmin: boolean) {
  try {
    const insertData: any = {
      name: task.name,
      category: task.category,
      due_date: task.dueDate,
      description: task.description,
      status: task.status,
      user_id: userId,
      is_admin_task: isAdmin
    };

    // Only add google_drive_links if there are links to add
    if (task.googleDriveLinks && task.googleDriveLinks.length > 0) {
      insertData.google_drive_links = task.googleDriveLinks;
    }

    // Try to insert with Google Drive links first, fallback without if column doesn't exist
    let data, error;

    try {
      const result = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } catch (insertError: any) {
      // If the error is about google_drive_links column, try without it
      if (insertError.message?.includes('google_drive_links') || insertError.message?.includes('schema cache')) {
        console.log('Google Drive links column not found, retrying without it...');

        // Remove google_drive_links from the insert data
        const { google_drive_links, ...dataWithoutGoogleDrive } = insertData;

        const fallbackResult = await supabase
          .from('tasks')
          .insert(dataWithoutGoogleDrive)
          .select()
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      } else {
        throw insertError;
      }
    }

    if (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }

    return mapTaskFromDB(data);
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  try {
    const updateData: any = {
      name: updates.name,
      category: updates.category,
      due_date: updates.dueDate,
      description: updates.description,
      status: updates.status
    };

    // Only add google_drive_links if it's defined
    if (updates.googleDriveLinks !== undefined) {
      updateData.google_drive_links = updates.googleDriveLinks;
    }

    // Try to update with Google Drive links first, fallback without if column doesn't exist
    let data, error;

    try {
      const result = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } catch (updateError: any) {
      // If the error is about google_drive_links column, try without it
      if (updateError.message?.includes('google_drive_links') || updateError.message?.includes('schema cache')) {
        console.log('Google Drive links column not found, retrying update without it...');

        // Remove google_drive_links from the update data
        const { google_drive_links, ...updatesWithoutGoogleDrive } = updateData;

        const fallbackResult = await supabase
          .from('tasks')
          .update(updatesWithoutGoogleDrive)
          .eq('id', taskId)
          .select()
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      } else {
        throw updateError;
      }
    }

    if (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
    
    return mapTaskFromDB(data);
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error('Failed to update task');
  }
}

export async function deleteTask(taskId: string) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
}

function mapTaskFromDB(data: any): Task {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    dueDate: data.due_date,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    isAdminTask: data.is_admin_task,
    googleDriveLinks: data.google_drive_links || [] // Handle missing column gracefully
  };
}