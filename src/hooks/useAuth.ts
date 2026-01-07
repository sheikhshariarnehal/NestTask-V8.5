import { useState, useEffect } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { dataCache, cacheKeys } from '../lib/dataCache';
import { loginUser, signupUser, logoutUser, resetPassword } from '../services/auth.service';
import { forceCleanReload, updateAuthStatus } from '../utils/auth';
import type { User, LoginCredentials, SignupCredentials } from '../types/auth';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

const REMEMBER_ME_KEY = 'nesttask_remember_me';
const SAVED_EMAIL_KEY = 'nesttask_saved_email';

// The function is exported directly here with 'export function' declaration
// Do not add a second export statement at the end of the file to avoid
// "Multiple exports with the same name" errors
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    if (savedEmail) {
      setSavedEmail(savedEmail);
    }
    
    // Check for cached user immediately before doing anything else
    const cachedUser = localStorage.getItem('nesttask_cached_user');
    if (cachedUser && mounted) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse cached user on mount:', err);
      }
    }
    
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      // Check network status first
      let isOnline = navigator.onLine;
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          isOnline = status.connected;
        } catch (err) {
          console.warn('Failed to get network status, using navigator.onLine');
        }
      }

      // If offline, try to load cached user from localStorage
      if (!isOnline) {
        console.log('Offline mode: Loading cached user data');
        const cachedUser = localStorage.getItem('nesttask_cached_user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            console.log('Successfully loaded cached user:', parsedUser.email);
            setIsInitialLoad(false);
            setLoading(false);
            return;
          } catch (err) {
            console.error('Failed to parse cached user:', err);
          }
        }
        // No cached user, proceed to show login
        console.log('No cached user found for offline mode');
        setIsInitialLoad(false);
        setLoading(false);
        return;
      }

      // Online: proceed with normal authentication check
      const isConnected = await testConnection();
      
      if (!isConnected) {
        console.warn('Database connection test failed');
        // Try cached user as fallback
        const cachedUser = localStorage.getItem('nesttask_cached_user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            console.log('Using cached user due to connection issues');
            setLoading(false);
            return;
          } catch (err) {
            console.error('Failed to parse cached user:', err);
          }
        }
      }

      // Try to get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting auth session:', sessionError.message);
        // Try cached user as fallback
        const cachedUser = localStorage.getItem('nesttask_cached_user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            console.log('Using cached user due to session error');
          } catch (err) {
            console.error('Failed to parse cached user:', err);
          }
        }
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        await updateUserState(session.user);
      } else {
        console.log('No active session found');
        setIsInitialLoad(false);
      }
    } catch (err: any) {
      console.error('Session check error:', err);
      
      // Only show error if we're online
      let isOnline = navigator.onLine;
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          isOnline = status.connected;
        } catch {}
      }

      if (isOnline) {
        setError('Failed to check authentication status');
        
        if (retryCount < 3) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Will retry session check in ${timeout}ms`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkSession();
          }, timeout);
          return;
        }
      } else {
        // Offline: Try to use cached user
        console.log('Offline mode: Attempting to load cached user');
        const cachedUser = localStorage.getItem('nesttask_cached_user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            console.log('Loaded cached user for offline use');
          } catch (err) {
            console.error('Failed to parse cached user:', err);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthChange = async (_event: string, session: any) => {
    // Don't clear user on initial load if offline and we have cached user
    if (!session?.user && isInitialLoad) {
      console.log('No session on initial load, checking if we should preserve cached user');
      
      // Check if we're offline
      let isOnline = navigator.onLine;
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          isOnline = status.connected;
        } catch {}
      }
      
      // If offline and we have a user (from cache), don't clear it
      if (!isOnline && user) {
        console.log('Preserving cached user while offline');
        setIsInitialLoad(false);
        setLoading(false);
        return;
      }
    }
    
    setIsInitialLoad(false);
    
    if (session?.user) {
      try {
        await updateUserState(session.user);
      } catch (err) {
        console.error('Error updating user state:', err);
        
        // Check if offline before invalidating session
        let isOnline = navigator.onLine;
        if (Capacitor.isNativePlatform()) {
          try {
            const status = await Network.getStatus();
            isOnline = status.connected;
          } catch {}
        }
        
        // Only invalidate if online
        if (isOnline) {
          await handleInvalidSession();
        } else {
          console.log('Error updating user state while offline, keeping cached user');
        }
      }
    } else {
      // Only clear user if we're online
      let isOnline = navigator.onLine;
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          isOnline = status.connected;
        } catch {}
      }
      
      if (isOnline) {
        console.log('No session and online, clearing user');
        setUser(null);
      } else {
        console.log('No session but offline, keeping cached user');
      }
    }
    setLoading(false);
  };

  const handleInvalidSession = async () => {
    setUser(null);
    updateAuthStatus(false);
    
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('nesttask_user');
    localStorage.removeItem('nesttask_cached_user');
    sessionStorage.removeItem('supabase.auth.token');
    
    if (localStorage.getItem(REMEMBER_ME_KEY) !== 'true') {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear caches without page reload
    forceCleanReload();
  };

  const updateUserState = async (authUser: any) => {
    try {
      // Check cache first
      const cacheKey = cacheKeys.userWithFullInfo(authUser.id);
      const cachedUser = dataCache.get<any>(cacheKey);
      
      let fullUserData;
      
      if (cachedUser) {
        fullUserData = cachedUser;
      } else {
        // Fetch full user data with department/batch/section names using the view
        const { data, error: userError } = await supabase
          .from('users_with_full_info')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (userError) {
          console.error('Error fetching user data:', userError);
          throw userError;
        }
        
        fullUserData = data;
        
        // Cache the result
        dataCache.set(cacheKey, fullUserData);
      }
      
      let role = fullUserData?.role || authUser.user_metadata?.role || 'user';
      
      if (role === 'super_admin' || role === 'super-admin') {
        role = 'super-admin';
      }
      
      const userObj = {
        id: authUser.id,
        email: authUser.email!,
        name: fullUserData?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
        role: role as 'user' | 'admin' | 'super-admin' | 'section_admin',
        createdAt: fullUserData?.createdAt || authUser.created_at,
        avatar: fullUserData?.avatar,
        phone: fullUserData?.phone,
        studentId: fullUserData?.studentId,
        departmentId: fullUserData?.departmentId,
        batchId: fullUserData?.batchId,
        sectionId: fullUserData?.sectionId,
        departmentName: fullUserData?.departmentName,
        batchName: fullUserData?.batchName,
        sectionName: fullUserData?.sectionName
      };
      
      setUser(userObj);
      
      // Cache user for offline access
      try {
        localStorage.setItem('nesttask_cached_user', JSON.stringify(userObj));
      } catch (err) {
        console.warn('Failed to cache user data:', err);
      }
    } catch (err) {
      console.error('Error updating user state:', err);
      throw err;
    }
  };

  const login = async (credentials: LoginCredentials, rememberMe: boolean = false) => {
    try {
      setError(null);
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        localStorage.setItem(SAVED_EMAIL_KEY, credentials.email);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      
      // Check for development mode more robustly
      const isDevelopment = import.meta.env.DEV || 
                          import.meta.env.MODE === 'development' ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
      
      // Try to load demo user from localStorage first (for development mode)
      if (isDevelopment && localStorage.getItem('nesttask_demo_user')) {
        try {
          const demoUser = JSON.parse(localStorage.getItem('nesttask_demo_user') || '{}');
          if (demoUser && demoUser.email === credentials.email) {
            console.log('Using cached demo user from localStorage:', demoUser);
            setUser(demoUser);
            updateAuthStatus(true);
            
            // Handle superadmin redirect for demo users too
            if (demoUser.role === 'super-admin' || demoUser.email === 'superadmin@nesttask.com') {
              console.log('Demo super admin detected');
              localStorage.setItem('is_super_admin', 'true');
              sessionStorage.setItem('is_super_admin', 'true');
              localStorage.setItem('auth_completed', 'true');
            }
            
            return demoUser;
          }
        } catch (err) {
          console.warn('Failed to parse demo user from localStorage');
        }
      }
      
      // Regular login process with the backend
      const user = await loginUser(credentials);
      console.log('User after login:', user);
      
      updateAuthStatus(true);
      
      // Check for superadmin role - use multiple conditions for robust detection
      if (
        user.role === 'super-admin' ||
        credentials.email === 'superadmin@nesttask.com' ||
        user.email === 'superadmin@nesttask.com'
      ) {
        console.log('Super admin login detected');
        
        // Ensure the role is set correctly
        user.role = 'super-admin';
        
        // Try to get from cache first
        const cacheKey = cacheKeys.userWithFullInfo(user.id || user.email);
        const cachedData = dataCache.get<any>(cacheKey);
        
        if (cachedData && cachedData.name) {
          user.name = cachedData.name;
        } else {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users_with_full_info')
              .select('*')
              .eq('email', user.email)
              .single();
              
            if (!userError && userData) {
              console.log('Super admin data from database:', userData);
              if (userData.name) user.name = userData.name;
              // Cache it
              dataCache.set(cacheKey, userData);
            }
          } catch (err) {
            console.warn('Error fetching super admin data, using default values', err);
          }
        }
        
        localStorage.setItem('is_super_admin', 'true');
        sessionStorage.setItem('is_super_admin', 'true');
        localStorage.setItem('auth_completed', 'true');
        
        setUser(user);
        
        // Cache super-admin user for offline access
        try {
          localStorage.setItem('nesttask_cached_user', JSON.stringify(user));
          console.log('Super-admin user cached after login for offline access');
        } catch (cacheErr) {
          console.warn('Failed to cache super-admin user after login:', cacheErr);
        }
        
        return user;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error('Error fetching user data after login:', userError);
      } else {
        console.log('User data from database after login:', userData);
        if (userData) {
          if (userData.role) {
            user.role = userData.role as 'user' | 'admin' | 'super-admin' | 'section_admin';
            console.log('Updated user role from database:', user.role);
          }
          
          if (userData.department_id) {
            user.departmentId = userData.department_id;
            console.log('Updated user department ID:', user.departmentId);
          }
          
          if (userData.batch_id) {
            user.batchId = userData.batch_id;
            console.log('Updated user batch ID:', user.batchId);
          }
          
          if (userData.section_id) {
            user.sectionId = userData.section_id;
            console.log('Updated user section ID:', user.sectionId);
          }
          
          if (userData.phone) {
            user.phone = userData.phone;
          }
          
          if (userData.student_id) {
            user.studentId = userData.student_id;
          }
          
          if (userData.avatar) {
            user.avatar = userData.avatar;
          }
        }
      }
      
      setUser(user);
      
      // Cache user for offline access
      try {
        localStorage.setItem('nesttask_cached_user', JSON.stringify(user));
        console.log('User cached after login for offline access');
      } catch (cacheErr) {
        console.warn('Failed to cache user after login:', cacheErr);
      }
      
      // Clear caches without page reload
      forceCleanReload();
      
      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setError(null);
      console.log('Starting signup process with credentials:', {
        ...credentials,
        password: '[REDACTED]'
      });
      
      if (credentials.departmentId) {
        console.log(`Department selected: ${credentials.departmentId}`);
      }
      if (credentials.batchId) {
        console.log(`Batch selected: ${credentials.batchId}`);
      }
      if (credentials.sectionId) {
        console.log(`Section selected: ${credentials.sectionId}`);
      }
      
      const user = await signupUser(credentials);
      console.log('Signup successful, user data:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        batchId: user.batchId,
        sectionId: user.sectionId
      });
      
      // Set user state
      setUser(user);
      
      // Cache user for offline access and session persistence
      try {
        localStorage.setItem('nesttask_cached_user', JSON.stringify(user));
        localStorage.setItem('nesttask_user', JSON.stringify(user));
        console.log('User cached after signup');
      } catch (cacheErr) {
        console.warn('Failed to cache user after signup:', cacheErr);
      }
      
      // Update auth status
      updateAuthStatus(true);
      
      return user;
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('Starting optimized logout...');
      setError(null);
      
      // Set user to null immediately for instant UI update
      setUser(null);
      updateAuthStatus(false);
      
      // Batch all sync operations together
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      
      // Clear data cache
      dataCache.clear();
      
      // Batch localStorage operations
      const itemsToRemove = [
        'supabase.auth.token',
        'nesttask_user',
        'nesttask_cached_user',
        'nesttask_refresh_interval',
        'is_super_admin',
        'auth_completed'
      ];
      
      if (!rememberMe) {
        itemsToRemove.push(SAVED_EMAIL_KEY);
      }
      
      // Efficient batch removal
      itemsToRemove.forEach(item => localStorage.removeItem(item));
      sessionStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('is_super_admin');
      
      // Clear cookies efficiently
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Call Supabase signOut in parallel with cache clear
      const signOutPromise = logoutUser();
      const cleanReloadPromise = forceCleanReload();
      
      await Promise.all([signOutPromise, cleanReloadPromise]);
      
      console.log('Logout completed');
      return true;
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
      // Don't throw - ensure logout completes even with errors
      return false;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Clear cache before fetching fresh data
        const cacheKey = cacheKeys.userWithFullInfo(session.user.id);
        dataCache.clear();
        await updateUserState(session.user);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    forgotPassword,
    savedEmail,
    refreshUser,
  };
}