export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  studentId?: string;
  role: 'user' | 'admin' | 'super-admin' | 'section_admin';
  createdAt: string;
  lastActive?: string;
  avatar?: string;
  departmentId?: string;
  departmentName?: string;
  batchId?: string;
  batchName?: string;
  sectionId?: string;
  sectionName?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  phone: string;
  studentId: string;
  departmentId?: string;
  batchId?: string;
  sectionId?: string;
}

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  departmentId: string;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  batchId: string;
  createdAt: string;
}
