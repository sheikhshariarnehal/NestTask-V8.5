import { supabase } from '../lib/supabase';
import type { FCMTokenWithUser, FCMStatistics, TestNotificationPayload } from '../types/fcm';

/**
 * Verify if user is a section admin for the given section
 */
async function verifySectionAdmin(userId: string, sectionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('section_admins')
    .select('id')
    .eq('user_id', userId)
    .eq('section_id', sectionId)
    .single();

  return !error && !!data;
}

/**
 * Fetch FCM tokens for users in a specific section
 */
export async function fetchSectionFCMTokens(
  sectionId: string,
  userId: string
): Promise<FCMTokenWithUser[]> {
  // Verify section admin permissions
  const isAdmin = await verifySectionAdmin(userId, sectionId);
  if (!isAdmin) {
    throw new Error('Unauthorized: You are not a section admin for this section');
  }

  // First, get all users in the section
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, student_id, section_id')
    .eq('section_id', sectionId);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw usersError;
  }

  if (!users || users.length === 0) {
    return [];
  }

  // Get user IDs
  const userIds = users.map(u => u.id);

  // Fetch tokens for these users
  const { data: tokens, error: tokensError } = await supabase
    .from('fcm_tokens')
    .select('*')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false });

  if (tokensError) {
    console.error('Error fetching FCM tokens:', tokensError);
    throw tokensError;
  }

  // Create a map of users for quick lookup
  const userMap = new Map(users.map(u => [u.id, u]));

  // Join tokens with user data
  const tokensWithUsers: FCMTokenWithUser[] = (tokens || [])
    .map(token => {
      const user = userMap.get(token.user_id);
      if (!user) return null;
      return {
        ...token,
        users: user,
      } as FCMTokenWithUser;
    })
    .filter(t => t !== null) as FCMTokenWithUser[];

  return tokensWithUsers;
}

/**
 * Get FCM token statistics for a section
 */
export async function getSectionFCMStatistics(
  sectionId: string,
  userId: string
): Promise<FCMStatistics> {
  // Verify section admin permissions
  const isAdmin = await verifySectionAdmin(userId, sectionId);
  if (!isAdmin) {
    throw new Error('Unauthorized: You are not a section admin for this section');
  }

  // Get all users in the section
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id')
    .eq('section_id', sectionId);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw usersError;
  }

  const totalUsers = users?.length || 0;

  if (totalUsers === 0) {
    // No users in section, return empty stats
    return {
      totalTokens: 0,
      activeTokens: 0,
      inactiveTokens: 0,
      androidTokens: 0,
      iosTokens: 0,
      webTokens: 0,
      totalUsers: 0,
      usersWithTokens: 0,
      coveragePercentage: 0,
      lastRegistration: null,
    };
  }

  const userIds = users.map(u => u.id);

  // Fetch tokens for these users
  const { data: tokens, error: tokensError } = await supabase
    .from('fcm_tokens')
    .select('*')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  if (tokensError) {
    console.error('Error fetching tokens for stats:', tokensError);
    throw tokensError;
  }

  const tokenList = tokens || [];
  const activeTokens = tokenList.filter(t => t.is_active);
  const uniqueUsersWithTokens = new Set(
    activeTokens.map(t => t.user_id)
  ).size;

  // Calculate statistics
  const stats: FCMStatistics = {
    totalTokens: tokenList.length,
    activeTokens: activeTokens.length,
    inactiveTokens: tokenList.length - activeTokens.length,
    androidTokens: activeTokens.filter(t => t.platform === 'android').length,
    iosTokens: activeTokens.filter(t => t.platform === 'ios').length,
    webTokens: activeTokens.filter(t => t.platform === 'web').length,
    totalUsers: totalUsers || 0,
    usersWithTokens: uniqueUsersWithTokens,
    coveragePercentage: totalUsers ? (uniqueUsersWithTokens / totalUsers) * 100 : 0,
    lastRegistration: tokenList.length > 0 ? tokenList[0].created_at : null,
  };

  return stats;
}

/**
 * Send test notification to specific users in a section
 */
export async function sendTestNotification(
  payload: TestNotificationPayload,
  sectionId: string,
  userId: string
): Promise<{ success: boolean; message: string; details?: any }> {
  // Verify section admin permissions
  const isAdmin = await verifySectionAdmin(userId, sectionId);
  if (!isAdmin) {
    throw new Error('Unauthorized: You are not a section admin for this section');
  }

  try {
    // Call the existing send-fcm-push edge function
    const { data, error } = await supabase.functions.invoke('send-fcm-push', {
      body: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sectionId: sectionId,
        userIds: payload.userIds,
      },
    });

    if (error) {
      console.error('Error sending test notification:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        details: error,
      };
    }

    return {
      success: true,
      message: `Notification sent successfully to ${data?.sent || 0} device(s)`,
      details: data,
    };
  } catch (error: any) {
    console.error('Error invoking send-fcm-push function:', error);
    return {
      success: false,
      message: error.message || 'Failed to send notification',
      details: error,
    };
  }
}

/**
 * Export FCM tokens to CSV format
 */
export function exportTokensToCSV(tokens: FCMTokenWithUser[]): string {
  const headers = ['User Name', 'Email', 'Student ID', 'Platform', 'Status', 'Last Updated'];
  const rows = tokens.map(token => [
    token.users.name || 'N/A',
    token.users.email,
    token.users.student_id || 'N/A',
    token.platform,
    token.is_active ? 'Active' : 'Inactive',
    new Date(token.updated_at).toLocaleString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}
