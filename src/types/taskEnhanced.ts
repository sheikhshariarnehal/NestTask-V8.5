import { TaskCategory, TaskStatus } from './task';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type AssignmentStatus = 'assigned' | 'accepted' | 'in-progress' | 'completed' | 'declined';

export interface EnhancedTask {
  id: string;
  name: string;
  category: TaskCategory;
  dueDate: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt?: string;
  isAdminTask: boolean;
  sectionId?: string | null;
  departmentId?: string | null;
  batchId?: string | null;
  priority: TaskPriority;
  tags: string[];
  assignedTo?: string | null;
  assignedBy?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  attachments: string[];
  googleDriveLinks?: string[];
  isTemplate: boolean;
  templateName?: string | null;
  userId: string;
  
  // Joined data
  assignedToUser?: {
    id: string;
    name: string;
    email: string;
  };
  assignedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  section?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
  batch?: {
    id: string;
    name: string;
  };
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  status: AssignmentStatus;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
  };
  task?: EnhancedTask;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string | null;
  action: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  
  // Joined data
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  tags: string[];
  defaultDueDays: number;
  sectionId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  useCount: number;
  
  // Joined data
  section?: {
    id: string;
    name: string;
  };
}

export interface TaskFilters {
  search?: string;
  category?: TaskCategory | 'all';
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assignedTo?: string;
  sectionId?: string;
  tags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  overdue?: boolean;
}

export interface TaskSortOptions {
  field: 'name' | 'dueDate' | 'createdAt' | 'priority' | 'status' | 'category';
  direction: 'asc' | 'desc';
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  highPriorityTasks: number;
  completionRate: number;
}

export interface UserTaskPerformance {
  userId: string;
  userName: string;
  totalAssigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
  avgCompletionDays: number;
}

export interface BulkTaskOperation {
  taskIds: string[];
  operation: 'delete' | 'updateStatus' | 'updatePriority' | 'assign' | 'addTags';
  value?: any;
}

export interface TaskAnalyticsData {
  statistics: TaskStatistics;
  categoryDistribution: Array<{ category: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  completionTrend: Array<{ date: string; completed: number; created: number }>;
  overdueByCategory: Array<{ category: string; count: number }>;
  userPerformance: UserTaskPerformance[];
}

export interface PaginatedTasksResponse {
  tasks: EnhancedTask[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CreateTaskInput {
  name: string;
  description: string;
  category: TaskCategory;
  dueDate: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  assignedTo?: string;
  sectionId?: string;
  attachments?: string[];
  googleDriveLinks?: string[];
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  category?: TaskCategory;
  dueDate?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  assignedTo?: string;
  attachments?: string[];
  googleDriveLinks?: string[];
}
