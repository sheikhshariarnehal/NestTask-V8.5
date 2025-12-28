export type AdminTab = 'dashboard' | 'users' | 'tasks' | 'task-management-v2' | 'announcements' | 'courses' | 'study-materials' | 'lecture-slides' | 'routine' | 'teachers' | 'super-admin';

/**
 * Admin User type definition
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role?: string;
  department?: string;
  departmentId?: string;
  batch?: string;
  batchId?: string;
  section?: string;
  sectionId?: string;
  permissions?: string[];
  isActive: boolean;
  status: 'active' | 'disabled';
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  studentId?: string;
}

/**
 * Admin Permission type
 */
export type AdminPermission = 
  | 'viewUsers' 
  | 'createUsers' 
  | 'editUsers' 
  | 'deleteUsers' 
  | 'viewSettings' 
  | 'editSettings' 
  | 'viewReports' 
  | 'exportData'
  | 'manageAdmins'
  | 'viewLogs';

/**
 * Admin Log Details type
 */
export interface AdminLogDetails {
  userId?: string;
  username?: string;
  setting?: string;
  oldValue?: string;
  newValue?: string;
  [key: string]: any;
}

/**
 * Admin Log type definition
 */
export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  details: AdminLogDetails;
}

/**
 * Admin Statistics type
 */
export interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  departmentDistribution: {
    department: string;
    count: number;
  }[];
  roleDistribution: {
    role: string;
    count: number;
  }[];
  monthlyActivity: {
    month: string;
    logins: number;
    actions: number;
  }[];
  permissionUsage: {
    permission: string;
    count: number;
  }[];
  recentLogins: {
    adminId: string;
    adminName: string;
    timestamp: string;
    ipAddress: string;
  }[];
  mostActiveAdmins: {
    adminId: string;
    adminName: string;
    actionsCount: number;
  }[];
  disabledAdmins?: number;
  adminsByDepartment?: Record<string, number>;
  permissionChanges?: number;
}

/**
 * Admin Role type
 */
export type AdminRole = 'Super Admin' | 'Department Admin' | 'Regular Admin';