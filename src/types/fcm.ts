export interface FCMToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  device_info: {
    platform?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FCMTokenWithUser extends FCMToken {
  users: {
    id: string;
    name: string | null;
    email: string;
    student_id: string | null;
    section_id: string | null;
  };
}

export interface FCMStatistics {
  totalTokens: number;
  activeTokens: number;
  inactiveTokens: number;
  androidTokens: number;
  iosTokens: number;
  webTokens: number;
  totalUsers: number;
  usersWithTokens: number;
  coveragePercentage: number;
  lastRegistration: string | null;
}

export interface TestNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  userIds?: string[];
}
