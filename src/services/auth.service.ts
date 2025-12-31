import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../utils/authErrors';
import type { LoginCredentials, SignupCredentials, User } from '../types/auth';
import type { Database } from '../types/supabase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];

// Default user settings
const defaultUserSettings = {
  theme: 'light',
  notifications: true,
  language: 'en',
};

// Check if "Remember me" is enabled
const isRememberMeEnabled = () => localStorage.getItem('nesttask_remember_me') === 'true';

// Define a custom interface for the database user to avoid conflicts
interface SupabaseUser {
  id: string;
  email: string;
  name?: string | null;
  username?: string;
  role?: string;
  created_at?: string;
  last_active?: string;
  avatar?: string;
  phone?: string;
  department_id?: string;
  batch_id?: string;
  section_id?: string;
  student_id?: string;
}

// Initialize IndexedDB
const DB_NAME = 'nesttask-auth-storage';
const DB_VERSION = 1;
const STORE_NAME = 'auth';

async function initializeIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Check if the store already exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('Created auth store in IndexedDB');
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };
  });
}

// Helper function to store data in IndexedDB
async function storeInIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await initializeIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(value, key);
      
      request.onerror = () => {
        console.error('Error storing in IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('Failed to store in IndexedDB:', error);
  }
}

export async function loginUser({ email, password }: LoginCredentials): Promise<User> {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Debug logging for authentication debugging
    console.log(`Attempting login for email: ${email}`);
    
    // Development mode - check more robustly if in development
    const isDevelopment = import.meta.env.DEV || 
                          import.meta.env.MODE === 'development' ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
    
    // Demo test accounts for easy development login
    const testAccounts = [
      'test@example.com',
      'admin@example.com',
      'demo@nesttask.com',
      'test@nesttask.com',
      'user@nesttask.com',
      'superadmin@nesttask.com'
    ];
    
    // In development, accept ANY password for these test accounts
    if (isDevelopment && testAccounts.includes(email)) {
      // List of passwords to accept in development
      const validDevPasswords = ['password123', 'password', 'test', 'demo', '123456', ''];
      
      console.log('Using demo login for development');
      
      // Create a mock user and session for development testing
      const mockUser = {
        id: `dev-${Math.random().toString(36).substring(2, 9)}`,
        email: email,
        name: email.split('@')[0],
        // Assign specific roles based on the email address for easier testing
        role: email.includes('superadmin') ? 'super-admin' : 
              email.includes('admin') ? 'admin' : 
              email.includes('section') ? 'section-admin' : 'user',
        createdAt: new Date().toISOString(),
        avatar: undefined,
        phone: '+1234567890',
        lastActive: new Date().toISOString(),
        studentId: '12345',
        departmentId: 'dept-1',
        batchId: 'batch-1',
        sectionId: 'section-1'
      } as User;
      
      // Store in localStorage to simulate persistence
      localStorage.setItem('nesttask_demo_user', JSON.stringify(mockUser));
      localStorage.setItem('nesttask_remember_me', 'true');
      localStorage.setItem('nesttask_saved_email', email);
      localStorage.setItem('nesttask_auth_bypass', 'true');
      
      return mockUser;
    }

    // Set session persistence by ensuring we have a clean session state
    await supabase.auth.setSession({
      access_token: '',
      refresh_token: ''
    });

    // Set remember me to always true for persistent login
    localStorage.setItem('nesttask_remember_me', 'true');
    
    // Store the email for easy login in the future
    localStorage.setItem('nesttask_saved_email', email);

    // Try to login with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password
    });
    
    if (authError) {
      // If we're in development mode, allow any login with a fallback user
      if (isDevelopment) {
        console.warn('Development mode: Creating fallback user after failed login attempt');
        console.warn('Error from auth service:', authError.message);
        
        // Return a mock user as fallback in development
        const fallbackUser = {
          id: `dev-fallback-${Math.random().toString(36).substring(2, 9)}`,
          email: email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          avatar: undefined,
          phone: '+1234567890',
          lastActive: new Date().toISOString(),
          studentId: 'DEV12345',
          departmentId: 'dev-dept-1',
          batchId: 'dev-batch-1',
          sectionId: 'dev-section-1'
        } as User;
        
        // Store in localStorage for persistence
        localStorage.setItem('nesttask_demo_user', JSON.stringify(fallbackUser));
        localStorage.setItem('nesttask_auth_bypass', 'true');
        
        return fallbackUser;
      }
      
      // Non-development mode - throw the error
      console.error('Login error:', authError);
      
      // Add more specific error handling
      let errorMessage = getAuthErrorMessage(authError);
      
      if (authError.message && authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      }
      
      // For network errors
      if (authError.message && authError.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (!authData?.user) throw new Error('No user data received');

    // Store the session in localStorage AND IndexedDB for maximum persistence
    if (authData.session) {
      // Set up a periodic token refresh to ensure the session never expires
      // This runs every 12 hours to refresh the token silently in the background
      setupTokenRefresh(authData.session.refresh_token);
      
      // Store session data for persistence across browser restarts
      localStorage.setItem('supabase.auth.token', JSON.stringify(authData.session));
      
      // Store in IndexedDB for redundancy
      try {
        await storeInIndexedDB('session', JSON.stringify(authData.session));
        await storeInIndexedDB('email', email);
        await storeInIndexedDB('remember_me', true);
      } catch (e) {
        console.warn('IndexedDB storage failed, falling back to localStorage only', e);
      }
    }

    // Wait briefly for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select()
      .eq('id', authData.user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Create profile if it doesn't exist or there was an error
      const newUser: DbUserInsert = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || '',
        role: authData.user.user_metadata?.role || 'user',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };

      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user profile');
      }

      if (!newProfile) {
        throw new Error('No profile data received after creation');
      }

      return mapDbUserToUser(newProfile);
    }

    if (!profile) {
      // Create profile if it doesn't exist
      const newUser: DbUserInsert = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || '',
        role: authData.user.user_metadata?.role || 'user',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };

      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user profile');
      }

      if (!newProfile) {
        throw new Error('No profile data received after creation');
      }

      return mapDbUserToUser(newProfile);
    }

    return mapDbUserToUser(profile);
  } catch (error: any) {
    console.error('Login error:', error);
    // Enhanced error logging with more details
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('Error status:', error.status);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
    
    let errorMessage = getAuthErrorMessage(error);
    
    // Add more specific error handling
    if (error.message && error.message.includes('Invalid login credentials')) {
      if (import.meta.env.DEV) {
        console.warn('Try using test credentials in development mode: test@example.com / password123');
      }
      errorMessage = 'Invalid email or password. Please try again.';
    }
    
    // For network errors
    if (error.message && error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    throw new Error(errorMessage);
  }
}

export async function signupUser({ 
  email, 
  password, 
  name, 
  phone, 
  studentId, 
  departmentId, 
  batchId, 
  sectionId 
}: SignupCredentials): Promise<User> {
  try {
    // Validate required fields
    if (!email || !password || !name || !phone || !studentId) {
      throw new Error('All fields are required');
    }

    // Validate email domain if required for your university
    if (!email.endsWith('@diu.edu.bd')) {
      throw new Error('Please use your university email (@diu.edu.bd)');
    }

    console.log('Signup data:', {
      email, name, phone, studentId, departmentId, batchId, sectionId
    });

    // Register with Supabase Auth - ensure we use the correct metadata structure
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Use consistent field names matching what the trigger expects
          name,
          phone,
          studentId,
          role: 'user', // Default role
          departmentId,
          batchId,
          sectionId
        }
      }
    });

    if (error) throw error;

    if (!data?.user) {
      throw new Error('Failed to create user');
    }

    // Don't insert into public.users - let the handle_new_user trigger do it
    // Since the trigger will take care of creating the public.users record
    console.log('User created in auth, relying on database trigger to create profile');

    // Wait a longer time for the trigger to complete (2 seconds should be enough)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the user data from the database to ensure we have the correct role and other fields
    const { data: userData, error: userDataError } = await supabase
      .from('users_with_full_info')  // Use the new view with joined data
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data after signup:', userDataError);
      
      // Try one more time with the users table
      const { data: basicUserData, error: basicUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (basicUserError) {
        console.error('Second attempt failed to fetch user data:', basicUserError);
        // If we can't get the user data, return what we have
        return {
          id: data.user.id,
          email,
          name,
          phone,
          studentId,
          role: 'user',
          createdAt: new Date().toISOString(),
          departmentId,
          batchId,
          sectionId
        };
      }
      
      return mapDbUserToUser(basicUserData);
    }

    // Return the user data with all related info
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role as 'user' | 'admin' | 'super-admin' | 'section-admin',
      phone: userData.phone,
      studentId: userData.studentId,
      createdAt: userData.createdAt,
      lastActive: userData.lastActive,
      departmentId: userData.departmentId,
      departmentName: userData.departmentName,
      batchId: userData.batchId,
      batchName: userData.batchName,
      sectionId: userData.sectionId,
      sectionName: userData.sectionName
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    throw new Error(error.message || 'Failed to create account');
  }
}

export async function logoutUser(): Promise<void> {
  try {
    console.log('Starting logoutUser in auth.service...');
    
    // Clear any existing refresh intervals
    const intervalId = localStorage.getItem('nesttask_refresh_interval');
    if (intervalId) {
      clearInterval(parseInt(intervalId));
      localStorage.removeItem('nesttask_refresh_interval');
    }

    // Remove focus event listener
    window.removeEventListener('focus', handleFocusRefresh);

    // First try the regular sign out
    const { error } = await supabase.auth.signOut({
      scope: 'local' // Only clear the local session
    });
    
    if (error) {
      console.error('Supabase signOut error:', error);
      // Even if there's an error, continue with cleanup
    } else {
      console.log('Supabase auth.signOut successful');
    }

    // Clear all auth-related items
    console.log('Clearing local storage items...');
    localStorage.removeItem('nesttask_remember_me');
    localStorage.removeItem('nesttask_saved_email');
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.token');
    
    // Clear IndexedDB storage
    try {
      const db = await initializeIndexedDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
      db.close();
    } catch (e) {
      console.warn('Failed to clear IndexedDB storage:', e);
    }
    
    console.log('Logout process in auth.service completed');
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

// Helper function to handle focus refresh
async function handleFocusRefresh() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      await supabase.auth.refreshSession({
        refresh_token: data.session.refresh_token,
      });
    }
  } catch (err) {
    console.error('Failed to refresh token on focus:', err);
  }
}

// Helper function to setup token refresh
function setupTokenRefresh(refreshToken: string) {
  // Setup a periodic refresh every 12 hours
  const refreshInterval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  
  // Store the interval ID so we can clear it on logout
  const intervalId = setInterval(async () => {
    try {
      // Get the current session
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        // Refresh the session
        const { data: refreshData, error } = await supabase.auth.refreshSession({
          refresh_token: data.session.refresh_token,
        });
        
        if (error) {
          console.error('Error refreshing token:', error);
          return;
        }
        
        // Successfully refreshed - update stored session
        if (refreshData?.session) {
          localStorage.setItem('supabase.auth.token', JSON.stringify(refreshData.session));
          // Also update IndexedDB
          await storeInIndexedDB('session', JSON.stringify(refreshData.session));
        }
      }
    } catch (err) {
      console.error('Failed to refresh token:', err);
    }
  }, refreshInterval);
  
  // Store the interval ID in localStorage so we can retrieve it across page loads
  localStorage.setItem('nesttask_refresh_interval', intervalId.toString());
  
  // Add focus event listener for when user returns to the tab
  window.addEventListener('focus', handleFocusRefresh);
}

// Helper function to normalize role values
function normalizeRole(role: string): 'user' | 'admin' | 'super-admin' | 'section_admin' {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'super-admin':
    case 'super_admin':
      return 'super-admin';
    case 'section-admin':
    case 'section_admin':
      return 'section_admin';
    default:
      return 'user';
  }
}

// Helper function to map database user to User type
export function mapDbUserToUser(dbUser: SupabaseUser): User {
  console.log('Mapping DB user to User:', dbUser);
  
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || (dbUser.username as string) || dbUser.email.split('@')[0],
    role: normalizeRole(dbUser.role || 'user'),
    avatar: dbUser.avatar,
    phone: dbUser.phone,
    createdAt: dbUser.created_at || new Date().toISOString(),
    lastActive: dbUser.last_active,
    studentId: dbUser.student_id,
    departmentId: dbUser.department_id,
    batchId: dbUser.batch_id,
    sectionId: dbUser.section_id
  };
}

export async function resetPassword(email: string): Promise<void> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    console.log('Sending password reset email to:', email);
    
    // The redirectTo URL must be added to the "Additional Redirect URLs" in the Supabase Dashboard
    // under Authentication -> URL Configuration
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Add the hash fragment to force our app to show the reset password UI
      redirectTo: `${window.location.origin}/#auth/recovery`,
    });
    
    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      throw error;
    }
    
    console.log('Password reset email sent successfully');
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error) || 'Failed to send password reset email. Please try again.');
  }
}

export async function refreshUserRole(): Promise<boolean> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found when trying to refresh role');
      showErrorToast('Error: No user found');
      return false;
    }
    
    // Get user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      showErrorToast('Failed to fetch user role');
      return false;
    }
    
    if (!userData) {
      console.error('No user data found in database');
      showErrorToast('User not found in database');
      return false;
    }
    
    console.log('Current user role in metadata:', user.user_metadata?.role);
    console.log('Database user role:', userData.role);
    
    // Update user metadata with role from database
    if (userData.role !== user.user_metadata?.role) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          ...user.user_metadata,
          role: userData.role 
        }
      });
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        showErrorToast('Failed to update role');
        return false;
      }
      
      console.log('Successfully updated user role in metadata to:', userData.role);
      showSuccessToast(`Role updated to ${userData.role}`);
      
      // Return success without reloading the page
      return true;
    } else {
      console.log('User role already matches database, no update needed');
      showSuccessToast('Role is already up to date');
      return true;
    }
  } catch (error) {
    console.error('Error in refreshUserRole:', error);
    showErrorToast('Error updating role');
    return false;
  }
}