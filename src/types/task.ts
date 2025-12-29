export type TaskCategory = 
  | 'presentation' 
  | 'assignment' 
  | 'quiz' 
  | 'lab-report' 
  | 'lab-final' 
  | 'lab-performance'
  | 'task' 
  | 'documents'
  | 'blc'
  | 'groups'
  | 'project'
  | 'midterm'
  | 'final-exam'
  | 'others' 
  | 'all';

export type TaskStatus = 'my-tasks' | 'in-progress' | 'completed';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  dueDate: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  isAdminTask: boolean;
  sectionId?: string | null;
  priority?: TaskPriority;
  assignedBy?: string;
  assignedById?: string;
  updatedAt?: string;
  googleDriveLinks?: string[];
  attachments?: string[]; // Array of file URLs
  originalFileNames?: string[]; // Array of original file names corresponding to attachments
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'isAdminTask'> & {
  sectionId?: string;
};