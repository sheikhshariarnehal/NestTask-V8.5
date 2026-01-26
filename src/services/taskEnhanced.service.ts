import { supabase } from '../lib/supabase';
import { dataCache, cacheKeys } from '../lib/dataCache';
import type {
  EnhancedTask,
  TaskAssignment,
  TaskComment,
  TaskHistory,
  TaskTemplate,
  TaskFilters,
  TaskSortOptions,
  TaskStatistics,
  UserTaskPerformance,
  BulkTaskOperation,
  TaskAnalyticsData,
  PaginatedTasksResponse,
  CreateTaskInput,
  UpdateTaskInput,
  TaskPriority,
  AssignmentStatus
} from '../types/taskEnhanced';
import type { TaskCategory, TaskStatus } from '../types/task';

// ==================== CONFIGURATION ====================
const CONFIG = {
  MAX_RETRIES: 2,         // Two retries on failure
  RETRY_DELAY_MS: 1000,   // 1 second delay between retries
} as const;

// ==================== SUPABASE CLIENT WRAPPER ====================

/**
 * Simple, clean wrapper for Supabase operations with retry logic.
 * No custom timeout - Supabase handles its own timeouts and browser tab
 * throttling can cause false timeout errors.
 */
class SupabaseService {
  /**
   * Execute a Supabase operation with automatic retry
   */
  static async execute<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string = 'Operation',
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check if operation was cancelled
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled');
        }

        const { data, error } = await operation();
        
        if (error) {
          throw new Error(error.message || `${operationName} failed`);
        }
        
        if (data === null) {
          throw new Error(`${operationName}: No data returned`);
        }
        
        return data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if cancelled
        if (error.message === 'Operation cancelled' || abortSignal?.aborted) {
          throw new Error('Operation cancelled');
        }
        
        // Don't retry on auth errors
        if (error.message?.includes('JWT') || error.message?.includes('session')) {
          throw new Error('Session expired. Please refresh the page.');
        }
        
        // Retry on network errors
        if (attempt < CONFIG.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
          continue;
        }
      }
    }

    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Execute a Supabase operation that doesn't return data (delete, etc.)
   */
  static async executeVoid(
    operation: () => Promise<{ error: any }>,
    operationName: string = 'Operation'
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        const { error } = await operation();
        
        if (error) {
          throw new Error(error.message || `${operationName} failed`);
        }
        
        return;
      } catch (error: any) {
        lastError = error;
        
        if (error.message?.includes('JWT') || error.message?.includes('session')) {
          throw new Error('Session expired. Please refresh the page.');
        }
        
        if (attempt < CONFIG.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
          continue;
        }
      }
    }

    throw lastError || new Error(`${operationName} failed`);
  }
}

function withAbortSignal<TQuery>(query: TQuery, abortSignal?: AbortSignal): TQuery {
  if (!abortSignal) return query;
  const q: any = query as any;
  if (typeof q?.abortSignal === 'function') {
    return q.abortSignal(abortSignal);
  }
  return query;
}

// ==================== TASK CRUD OPERATIONS ====================

/**
 * Fetch tasks with pagination, filtering, and sorting
 * Now with intelligent caching and request deduplication
 */
export async function fetchTasksEnhanced(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    filters?: TaskFilters;
    sort?: TaskSortOptions;
    sectionId?: string;
    abortSignal?: AbortSignal;
    bypassCache?: boolean;
  } = {}
): Promise<PaginatedTasksResponse> {
  const { page = 1, pageSize = 25, filters = {}, sort, sectionId, abortSignal, bypassCache = false } = options;
  
  // Generate cache key based on all parameters
  const filterKey = JSON.stringify({ filters, sort, sectionId, page, pageSize });
  const cacheKey = cacheKeys.tasksEnhanced(userId, filterKey);
  
  // Try to get from cache first (skip if bypassing or if there's an abort signal)
  if (!bypassCache && !abortSignal) {
    try {
      return await dataCache.getOrFetch(
        cacheKey,
        () => fetchTasksFromSupabase(userId, { page, pageSize, filters, sort, sectionId, abortSignal }),
        60000 // 1 minute cache for task lists
      );
    } catch (error) {
      // If cache fails, continue with direct fetch
      console.warn('[TaskService] Cache fetch failed, fetching directly:', error);
    }
  }
  
  return fetchTasksFromSupabase(userId, { page, pageSize, filters, sort, sectionId, abortSignal });
}

/**
 * Internal function to fetch tasks from Supabase
 */
async function fetchTasksFromSupabase(
  userId: string,
  options: {
    page: number;
    pageSize: number;
    filters: TaskFilters;
    sort?: TaskSortOptions;
    sectionId?: string;
    abortSignal?: AbortSignal;
  }
): Promise<PaginatedTasksResponse> {
  const { page, pageSize, filters, sort, sectionId, abortSignal } = options;
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tasks')
    .select(`
      id,
      name,
      description,
      category,
      due_date,
      status,
      priority,
      tags,
      created_at,
      updated_at,
      user_id,
      section_id,
      is_admin_task,
      assigned_to,
      assigned_by,
      attachments
    `, { count: 'exact' });

  // Apply section filter
  if (sectionId) {
    query = query.eq('section_id', sectionId);
  }

  // Apply filters
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters.dateRange?.start) {
    query = query.gte('due_date', filters.dateRange.start);
  }

  if (filters.dateRange?.end) {
    query = query.lte('due_date', filters.dateRange.end);
  }

  if (filters.overdue) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('due_date', today).neq('status', 'completed');
  }

  // Apply sorting
  if (sort) {
    const column = sort.field === 'dueDate' ? 'due_date' : 
                   sort.field === 'createdAt' ? 'created_at' :
                   sort.field;
    query = query.order(column, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(from, to);

  const execQuery = withAbortSignal(query, abortSignal) as any;
  const { data, error, count } = await execQuery;

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);

  return {
    tasks: (data || []).map(transformTaskFromDB),
    total: count || 0,
    page,
    pageSize,
    hasMore: count ? count > to + 1 : false,
  };
}

/**
 * Create a new task
 */
export async function createTaskEnhanced(
  userId: string,
  input: CreateTaskInput,
  sectionId?: string,
  abortSignal?: AbortSignal
): Promise<EnhancedTask> {
  const taskData = {
    name: input.name,
    description: input.description,
    category: input.category,
    due_date: input.dueDate,
    priority: input.priority || 'medium',
    tags: input.tags || [],
    assigned_to: input.assignedTo || null,
    assigned_by: input.assignedTo ? userId : null,
    section_id: sectionId || input.sectionId || null,
    attachments: input.attachments || [],
    google_drive_links: input.googleDriveLinks || [],
    status: input.status || 'pending',
    user_id: userId,
    is_admin_task: !!sectionId,
    is_template: false,
  };

  const data = await SupabaseService.execute(
    () => withAbortSignal(supabase.from('tasks').insert(taskData).select('*').single(), abortSignal) as any,
    'Create task',
    abortSignal
  );

  const newTask = transformTaskFromDB(data);

  // Send push notification in background (non-blocking)
  if (newTask.isAdminTask) {
    sendFCMPushNotification(newTask).catch(() => {});
  }

  return newTask;
}

/**
 * Update an existing task
 */
export async function updateTaskEnhanced(
  taskId: string,
  updates: UpdateTaskInput,
  abortSignal?: AbortSignal
): Promise<EnhancedTask> {
  const updateData: Record<string, any> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
  }
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
  if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
  if (updates.googleDriveLinks !== undefined) updateData.google_drive_links = updates.googleDriveLinks;

  const data = await SupabaseService.execute(
    () => withAbortSignal(supabase.from('tasks').update(updateData).eq('id', taskId).select('*').single(), abortSignal) as any,
    'Update task'
  );

  return transformTaskFromDB(data);
}

/**
 * Delete a task
 */
export async function deleteTaskEnhanced(taskId: string): Promise<void> {
  console.log('[taskEnhanced.service] deleteTaskEnhanced called with taskId:', taskId);
  
  try {
    await SupabaseService.executeVoid(
      () => supabase.from('tasks').delete().eq('id', taskId),
      'Delete task'
    );
    console.log('[taskEnhanced.service] Task deleted successfully:', taskId);
  } catch (error) {
    console.error('[taskEnhanced.service] Failed to delete task:', taskId, error);
    throw error;
  }
}

/**
 * Bulk delete tasks
 */
export async function bulkDeleteTasks(taskIds: string[]): Promise<void> {
  console.log('[taskEnhanced.service] bulkDeleteTasks called with', taskIds.length, 'tasks:', taskIds);
  
  try {
    await SupabaseService.executeVoid(
      () => supabase.from('tasks').delete().in('id', taskIds),
      'Bulk delete tasks'
    );
    console.log('[taskEnhanced.service] Bulk delete successful');
  } catch (error) {
    console.error('[taskEnhanced.service] Bulk delete failed:', error);
    throw error;
  }
}

/**
 * Bulk update task status
 */
export async function bulkUpdateTaskStatus(
  taskIds: string[],
  status: TaskStatus
): Promise<void> {
  const updateData: Record<string, any> = { status };
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  await SupabaseService.executeVoid(
    () => supabase.from('tasks').update(updateData).in('id', taskIds),
    'Bulk update status'
  );
}

/**
 * Bulk update task priority
 */
export async function bulkUpdateTaskPriority(
  taskIds: string[],
  priority: TaskPriority
): Promise<void> {
  await SupabaseService.executeVoid(
    () => supabase.from('tasks').update({ priority }).in('id', taskIds),
    'Bulk update priority'
  );
}

/**
 * Bulk add tags to tasks
 */
export async function bulkAddTags(taskIds: string[], tags: string[]): Promise<void> {
  // Fetch existing tasks to merge tags
  const existingTasks = await SupabaseService.execute(
    () => supabase.from('tasks').select('id, tags').in('id', taskIds),
    'Fetch tasks for tag update'
  );

  // Update each task with merged tags
  const updates = (existingTasks as any[])?.map(task => ({
    id: task.id,
    tags: Array.from(new Set([...(task.tags || []), ...tags])),
  }));

  if (updates?.length) {
    await SupabaseService.executeVoid(
      () => supabase.from('tasks').upsert(updates),
      'Bulk add tags'
    );
  }
}

// ==================== TASK ASSIGNMENTS ====================

/**
 * Assign task to users
 */
export async function assignTaskToUsers(
  taskId: string,
  userIds: string[],
  assignedBy: string,
  notes?: string
): Promise<TaskAssignment[]> {
  const assignments = userIds.map(userId => ({
    task_id: taskId,
    user_id: userId,
    assigned_by: assignedBy,
    status: 'assigned' as AssignmentStatus,
    notes,
  }));

  const { data, error } = await supabase
    .from('task_assignments')
    .insert(assignments)
    .select(`
      *,
      user:users!task_assignments_user_id_fkey(id, name, email)
    `);

  if (error) throw new Error(`Failed to assign task: ${error.message}`);

  return (data || []).map(transformAssignmentFromDB);
}

/**
 * Update assignment status
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus
): Promise<TaskAssignment> {
  const updateData: any = { status };
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .select(`
      *,
      user:users!task_assignments_user_id_fkey(id, name, email)
    `)
    .single();

  if (error) throw new Error(`Failed to update assignment: ${error.message}`);

  return transformAssignmentFromDB(data);
}

/**
 * Get task assignments
 */
export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      *,
      user:users!task_assignments_user_id_fkey(id, name, email)
    `)
    .eq('task_id', taskId)
    .order('assigned_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

  return (data || []).map(transformAssignmentFromDB);
}

// ==================== TASK COMMENTS ====================

/**
 * Add comment to task
 */
export async function addTaskComment(
  taskId: string,
  userId: string,
  comment: string
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      comment,
    })
    .select(`
      *,
      user:users(id, name, email)
    `)
    .single();

  if (error) throw new Error(`Failed to add comment: ${error.message}`);

  return transformCommentFromDB(data);
}

/**
 * Get task comments
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:users(id, name, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch comments: ${error.message}`);

  return (data || []).map(transformCommentFromDB);
}

/**
 * Update comment
 */
export async function updateTaskComment(
  commentId: string,
  comment: string
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .update({
      comment,
      is_edited: true,
    })
    .eq('id', commentId)
    .select(`
      *,
      user:users(id, name, email)
    `)
    .single();

  if (error) throw new Error(`Failed to update comment: ${error.message}`);

  return transformCommentFromDB(data);
}

/**
 * Delete comment
 */
export async function deleteTaskComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw new Error(`Failed to delete comment: ${error.message}`);
}

// ==================== TASK HISTORY ====================

/**
 * Get task history
 */
export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select(`
      *,
      user:users(id, name, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);

  return (data || []).map(transformHistoryFromDB);
}

// ==================== TASK TEMPLATES ====================

/**
 * Create task template
 */
export async function createTaskTemplate(
  userId: string,
  template: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>
): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      name: template.name,
      description: template.description,
      category: template.category,
      priority: template.priority,
      tags: template.tags,
      default_due_days: template.defaultDueDays,
      section_id: template.sectionId,
      created_by: userId,
      is_active: template.isActive,
    })
    .select(`
      *,
      section:sections(id, name)
    `)
    .single();

  if (error) throw new Error(`Failed to create template: ${error.message}`);

  return transformTemplateFromDB(data);
}

/**
 * Get task templates
 */
export async function getTaskTemplates(sectionId?: string): Promise<TaskTemplate[]> {
  let query = supabase
    .from('task_templates')
    .select(`
      *,
      section:sections(id, name)
    `)
    .eq('is_active', true)
    .order('use_count', { ascending: false });

  if (sectionId) {
    query = query.or(`section_id.eq.${sectionId},section_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);

  return (data || []).map(transformTemplateFromDB);
}

/**
 * Create task from template
 */
export async function createTaskFromTemplate(
  userId: string,
  templateId: string,
  overrides?: Partial<CreateTaskInput>
): Promise<EnhancedTask> {
  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw new Error(`Failed to fetch template: ${templateError.message}`);

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + template.default_due_days);

  // Create task from template
  const taskInput: CreateTaskInput = {
    name: overrides?.name || template.name,
    description: overrides?.description || template.description || '',
    category: overrides?.category || template.category,
    dueDate: overrides?.dueDate || dueDate.toISOString().split('T')[0],
    priority: overrides?.priority || template.priority,
    tags: overrides?.tags || template.tags,
    sectionId: overrides?.sectionId || template.section_id,
    ...overrides,
  };

  const task = await createTaskEnhanced(userId, taskInput);

  // Increment template use count
  await supabase
    .from('task_templates')
    .update({ use_count: template.use_count + 1 })
    .eq('id', templateId);

  return task;
}

/**
 * Delete task template
 */
export async function deleteTaskTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// ==================== ANALYTICS & STATISTICS ====================

/**
 * Get task statistics
 */
export async function getTaskStatistics(
  sectionId?: string,
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<TaskStatistics> {
  const { data, error } = await supabase
    .rpc('get_task_statistics', {
      p_section_id: sectionId || null,
      p_user_id: userId || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

  if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);

  return data[0];
}

/**
 * Get user task performance
 */
export async function getUserTaskPerformance(userId: string): Promise<UserTaskPerformance> {
  const { data, error } = await supabase
    .rpc('get_user_task_performance', { p_user_id: userId });

  if (error) throw new Error(`Failed to fetch performance: ${error.message}`);

  return data[0];
}

/**
 * Get comprehensive task analytics
 */
export async function getTaskAnalytics(sectionId?: string): Promise<TaskAnalyticsData> {
  // Get statistics
  const statistics = await getTaskStatistics(sectionId);

  // Get category distribution
  let categoryQuery = supabase
    .from('tasks')
    .select('category');

  if (sectionId) {
    categoryQuery = categoryQuery.eq('section_id', sectionId);
  }

  const { data: categoryData } = await categoryQuery;
  
  const categoryDistribution = Object.entries(
    (categoryData || []).reduce((acc: any, task: any) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category, count: count as number }));

  // Get priority distribution
  let priorityQuery = supabase
    .from('tasks')
    .select('priority');

  if (sectionId) {
    priorityQuery = priorityQuery.eq('section_id', sectionId);
  }

  const { data: priorityData } = await priorityQuery;
  
  const priorityDistribution = Object.entries(
    (priorityData || []).reduce((acc: any, task: any) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {})
  ).map(([priority, count]) => ({ priority, count: count as number }));

  // Get status distribution
  let statusQuery = supabase
    .from('tasks')
    .select('status');

  if (sectionId) {
    statusQuery = statusQuery.eq('section_id', sectionId);
  }

  const { data: statusData } = await statusQuery;
  
  const statusDistribution = Object.entries(
    (statusData || []).reduce((acc: any, task: any) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count: count as number }));

  // Get completion trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let trendQuery = supabase
    .from('tasks')
    .select('created_at, completed_at')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (sectionId) {
    trendQuery = trendQuery.eq('section_id', sectionId);
  }

  const { data: trendData } = await trendQuery;

  const completionTrend: Array<{ date: string; completed: number; created: number }> = [];
  // Process trend data here (simplified for now)

  // Get overdue by category
  const today = new Date().toISOString().split('T')[0];
  let overdueQuery = supabase
    .from('tasks')
    .select('category')
    .lt('due_date', today)
    .neq('status', 'completed');

  if (sectionId) {
    overdueQuery = overdueQuery.eq('section_id', sectionId);
  }

  const { data: overdueData } = await overdueQuery;
  
  const overdueByCategory = Object.entries(
    (overdueData || []).reduce((acc: any, task: any) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category, count: count as number }));

  return {
    statistics,
    categoryDistribution,
    priorityDistribution,
    statusDistribution,
    completionTrend,
    overdueByCategory,
    userPerformance: [],
  };
}

// ==================== FILE UPLOAD ====================

/**
 * Upload task attachment with original filename preservation
 */
export async function uploadTaskAttachment(
  file: File,
  taskId?: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; name: string; size: number }> {
  // Validation
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'svg',
    'zip', 'rar', '7z', 'mp4', 'mp3', 'wav'
  ];

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Validate file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    throw new Error(`File type .${fileExt} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Sanitize filename: remove special characters but keep original name
  const sanitizeFilename = (name: string): string => {
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    return sanitized || 'file'; // Fallback if name becomes empty
  };

  // Create unique filename while preserving original name
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(file.name);
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const fileName = `${sanitizedName}_${timestamp}_${uniqueId}.${fileExt}`;
  
  // Organize files by task or temp folder
  const filePath = taskId ? `tasks/${taskId}/${fileName}` : `temp/${fileName}`;

  try {
    // Upload with progress tracking if available
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      // Handle specific storage errors
      if (error.message.includes('already exists')) {
        throw new Error('A file with this name already exists. Please rename and try again.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(data.path);

    if (onProgress) {
      onProgress(100);
    }

    // Return structured data with original filename preserved
    return {
      url: urlData.publicUrl,
      name: file.name, // Original filename for display
      size: file.size,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to upload file. Please try again.');
  }
}

// ==================== HELPER FUNCTIONS ====================

function transformTaskFromDB(data: any): EnhancedTask {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    dueDate: data.due_date,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isAdminTask: data.is_admin_task || false,
    sectionId: data.section_id,
    departmentId: data.department_id,
    batchId: data.batch_id,
    priority: data.priority || 'medium',
    tags: data.tags || [],
    assignedTo: data.assigned_to,
    assignedBy: data.assigned_by,
    completedAt: data.completed_at,
    completedBy: data.completed_by,
    attachments: data.attachments || [],
    googleDriveLinks: data.google_drive_links || [],
    isTemplate: data.is_template || false,
    templateName: data.template_name,
    userId: data.user_id,
    assignedToUser: data.assignedToUser,
    assignedByUser: data.assignedByUser,
    section: data.section,
    department: data.department,
    batch: data.batch,
  };
}

function transformAssignmentFromDB(data: any): TaskAssignment {
  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    assignedBy: data.assigned_by,
    assignedAt: data.assigned_at,
    status: data.status,
    completedAt: data.completed_at,
    notes: data.notes,
    createdAt: data.created_at,
    user: data.user,
  };
}

function transformCommentFromDB(data: any): TaskComment {
  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isEdited: data.is_edited || false,
    user: data.user,
  };
}

function transformHistoryFromDB(data: any): TaskHistory {
  return {
    id: data.id,
    taskId: data.task_id,
    userId: data.user_id,
    action: data.action,
    fieldName: data.field_name,
    oldValue: data.old_value,
    newValue: data.new_value,
    metadata: data.metadata,
    createdAt: data.created_at,
    user: data.user,
  };
}

function transformTemplateFromDB(data: any): TaskTemplate {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    priority: data.priority,
    tags: data.tags || [],
    defaultDueDays: data.default_due_days,
    sectionId: data.section_id,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isActive: data.is_active,
    useCount: data.use_count || 0,
    section: data.section,
  };
}

/**
 * Send FCM push notification to mobile app users
 * This calls the Supabase Edge Function to send notifications via Firebase Cloud Messaging
 */
async function sendFCMPushNotification(task: EnhancedTask): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('[FCM Enhanced] Sending push notification for task:', task.id);
    console.log('[FCM Enhanced] Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('[FCM Enhanced] Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[FCM Enhanced] Supabase configuration missing, skipping FCM push notification');
      return;
    }

    // Format due date for notification
    const dueDate = new Date(task.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Category emoji mapping
    const categoryEmoji: Record<string, string> = {
      'presentation': '📊',
      'assignment': '📝',
      'quiz': '❓',
      'lab-report': '🔬',
      'lab-final': '🧪',
      'lab-performance': '⚗️',
      'task': '✓',
      'documents': '📄',
      'blc': '📚',
      'groups': '👥',
      'project': '🚀',
      'midterm': '📖',
      'final-exam': '🎓',
      'others': '📌'
    };

    // Format category name
    const categoryName = task.category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const emoji = categoryEmoji[task.category] || '📌';

    const payload = {
      taskId: task.id,
      title: `${emoji} New ${categoryName}`,
      body: `${task.name}\n📅 Due: ${dueDate}`,
      sectionId: task.sectionId || undefined,
      data: {
        taskId: task.id,
        category: task.category,
        categoryName: categoryName,
        priority: task.priority || 'medium',
        dueDate: task.dueDate,
        taskName: task.name
      }
    };

    console.log('[FCM Enhanced] Calling edge function with payload:', JSON.stringify(payload));

    const response = await fetch(`${supabaseUrl}/functions/v1/send-fcm-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[FCM Enhanced] Edge function response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[FCM Enhanced] Push notification failed:', errorData);
      throw new Error(`FCM push failed: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('[FCM Enhanced] Push notification result:', result);
  } catch (error) {
    console.error('[FCM Enhanced] Error sending push notification:', error);
    throw error;
  }
}
