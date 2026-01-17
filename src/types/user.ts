export interface UserStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super-admin';
  createdAt: string;
  avatar?: string;
}