import { supabase } from '../lib/supabase';

export async function testUserFetch() {
  try {
    console.log('Test: Fetching current user...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Test: Error fetching current user:', userError);
      return { success: false, error: userError.message };
    }
    
    console.log('Test: Current user:', user);
    console.log('Test: User metadata:', user?.user_metadata);
    
    // Fetch all users regardless of permissions
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
      
    if (usersError) {
      console.error('Test: Error fetching users:', usersError);
      return { success: false, error: usersError.message };
    }
    
    console.log('Test: Users data:', users);
    
    return { 
      success: true, 
      currentUser: user, 
      users: users
    };
  } catch (error: any) {
    console.error('Test: Unexpected error:', error);
    return { success: false, error: error.message };
  }
} 