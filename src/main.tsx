import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
// Import CSS (Vite handles this correctly)
import './index.css';
// Import Ionic CSS for components (non-critical, loaded after)
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import { MicroLoader } from './components/MicroLoader';
import { initPWA } from './utils/pwa';
import { supabase } from './lib/supabase';
import type { LoginCredentials, SignupCredentials } from './types/auth';
import { initPushNotificationListeners } from './services/pushNavigationService';

// Prefetch critical modules during idle time
const prefetchModules = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Check current path to prefetch appropriate modules
      const path = window.location.pathname;
      
      if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
        // Prefetch admin modules
        import('./pages/admin/AdminLayout');
        import('./pages/admin/DashboardPage');
      } else {
        // Prefetch user modules
        import('./App');
        import('./pages/AuthPage');
      }
    }, { timeout: 2000 });
  }
};

// Start prefetching immediately
prefetchModules();

// Lazy-load core pages with chunk names for better caching
const App = lazy(() => import(/* webpackChunkName: "app" */ './App'));
const ResetPasswordPage = lazy(() => import(/* webpackChunkName: "reset-password" */ './pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthPage = lazy(() => import(/* webpackChunkName: "auth" */ './pages/AuthPage').then(module => ({ default: module.AuthPage })));

// Lazy-load admin pages
const AdminLayout = lazy(() => import(/* webpackChunkName: "admin-layout" */ './pages/admin/AdminLayout').then(module => ({ default: module.AdminLayout })));
const DashboardPage = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ './pages/admin/DashboardPage').then(module => ({ default: module.DashboardPage })));
const UsersPage = lazy(() => import(/* webpackChunkName: "admin-users" */ './pages/admin/UsersPage').then(module => ({ default: module.UsersPage })));
const TasksPage = lazy(() => import(/* webpackChunkName: "admin-tasks" */ './pages/admin/TasksPage').then(module => ({ default: module.TasksPage })));
const TaskManagementPage = lazy(() => import(/* webpackChunkName: "admin-task-mgmt" */ './pages/admin/TaskManagementPage').then(module => ({ default: module.TaskManagementPage })));
const AnnouncementsPage = lazy(() => import(/* webpackChunkName: "admin-announcements" */ './pages/admin/AnnouncementsPage').then(module => ({ default: module.AnnouncementsPage })));
const LectureSlidesPage = lazy(() => import(/* webpackChunkName: "admin-slides" */ './pages/admin/LectureSlidesPage').then(module => ({ default: module.LectureSlidesPage })));
const FCMManagementPage = lazy(() => import(/* webpackChunkName: "admin-fcm" */ './pages/admin/FCMManagementPage'));
const SuperAdminPage = lazy(() => import(/* webpackChunkName: "admin-super" */ './pages/admin/SuperAdminPage').then(module => ({ default: module.SuperAdminPage })));

// Ensure environment variables are properly loaded in production
if (import.meta.env.PROD) {
  console.log('[Debug] Running in production mode - checking environment variables');
  // Check if we need to add environment variables to window for runtime access
  const runtimeEnv = window as unknown as {
    ENV_SUPABASE_URL?: string;
    ENV_SUPABASE_ANON_KEY?: string;
  };

  if (!import.meta.env.VITE_SUPABASE_URL && !runtimeEnv.ENV_SUPABASE_URL) {
    console.error('[Error] Missing Supabase URL in production environment');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !runtimeEnv.ENV_SUPABASE_ANON_KEY) {
    console.error('[Error] Missing Supabase Anon Key in production environment');
  }
}

// Conditionally import Analytics only in production
const Analytics = import.meta.env.PROD 
  ? lazy(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })))
  : () => null;

const shouldRenderAnalytics = import.meta.env.PROD && !Capacitor.isNativePlatform();

// Simple error boundary for analytics
const AnalyticsErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  if (!shouldRenderAnalytics) return null;
  return <>{children}</>;
};

// Define app routes
//
// Note: The app manages in-app navigation by updating `window.history` directly
// (e.g. /routine, /upcoming). React Router only evaluates the URL on initial load
// and on navigations it owns, so we must ensure those URLs are valid routes.
//
// A catch-all route guarantees that refreshing on /routine (etc.) renders <App />
// instead of the default React Router 404 error boundary.
const router = createBrowserRouter([
  {
    path: '/auth',
    loader: async () => {
      // Redirect to appropriate page if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (userData?.role === 'super-admin') {
          return Response.redirect('/superadmin/dashboard');
        } else if (userData?.role === 'admin' || userData?.role === 'section_admin') {
          return Response.redirect('/admin/dashboard');
        }
        return Response.redirect('/');
      }
      return null;
    },
    element: (
      <Suspense fallback={<MicroLoader />}>
        <AuthPage
          onLogin={async (credentials: LoginCredentials) => {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: credentials.email,
              password: credentials.password
            });
            if (error) throw error;
            
            // Check user role and redirect
            if (data.user) {
              const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();
              
              if (userData?.role === 'super-admin') {
                window.location.href = '/superadmin/dashboard';
              } else if (userData?.role === 'admin' || userData?.role === 'section_admin') {
                window.location.href = '/admin/dashboard';
              } else {
                window.location.href = '/';
              }
            }
          }}
          onSignup={async (credentials: SignupCredentials) => {
            const { error } = await supabase.auth.signUp({
              email: credentials.email,
              password: credentials.password,
              options: { data: { name: credentials.name } }
            });
            if (error) throw error;
          }}
          onForgotPassword={async (email: string) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
          }}
        />
      </Suspense>
    )
  },
  {
    path: '/reset-password',
    element: <Suspense fallback={<MicroLoader />}><ResetPasswordPage /></Suspense>
  },
  {
    path: '/admin',
    element: <Suspense fallback={<MicroLoader />}><AdminLayout /></Suspense>,
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<MicroLoader />}><DashboardPage /></Suspense>
      },
      {
        path: 'users',
        element: <Suspense fallback={<MicroLoader />}><UsersPage /></Suspense>
      },
      {
        path: 'tasks',
        element: <Suspense fallback={<MicroLoader />}><TasksPage /></Suspense>
      },
      {
        path: 'task-management',
        element: <Suspense fallback={<MicroLoader />}><TaskManagementPage /></Suspense>
      },
      {
        path: 'announcements',
        element: <Suspense fallback={<MicroLoader />}><AnnouncementsPage /></Suspense>
      },
      {
        path: 'lecture-slides',
        element: <Suspense fallback={<MicroLoader />}><LectureSlidesPage /></Suspense>
      },
      {
        path: 'fcm-management',
        element: <Suspense fallback={<MicroLoader />}><FCMManagementPage /></Suspense>
      },
      {
        path: 'super-admin',
        element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
      }
    ]
  },
  {
    path: '/superadmin/dashboard',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/overview',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/admins',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/sectionadmins',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/analytics',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/logs',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '/superadmin/security',
    element: <Suspense fallback={<MicroLoader />}><SuperAdminPage /></Suspense>
  },
  {
    path: '*',
    element: <Suspense fallback={<MicroLoader />}><App /></Suspense>
  }
]);

// Initialize native push listeners as early as possible (before React renders)
initPushNotificationListeners();

// Initialize app with minimal operations
function initApp() {
  // Add DNS prefetch for critical domains
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      const url = new URL(import.meta.env.VITE_SUPABASE_URL);
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url.origin;
      document.head.appendChild(link);
    } catch {
      // Silently fail - non-critical
    }
  }
  
  // Get root element and create React root
  const root = document.getElementById('root');
  if (!root) return;
  
  const reactRoot = createRoot(root);
  
  // Render app with minimal surrounding components
  reactRoot.render(
    <StrictMode>
      <Suspense fallback={<MicroLoader />}>
        <RouterProvider router={router} />
        {shouldRenderAnalytics && (
          <AnalyticsErrorBoundary>
            <Suspense fallback={null}>
              <Analytics />
              <SpeedInsights />
            </Suspense>
          </AnalyticsErrorBoundary>
        )}
      </Suspense>
    </StrictMode>
  );
  
  // Initialize PWA features (service worker registered in index.html)
  // Never run PWA utilities in native Capacitor WebView.
  if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
    // Wait for existing registration before initializing PWA utilities
    navigator.serviceWorker.ready.then(() => {
      setTimeout(() => initPWA(), 500);
    }).catch(() => {
      // SW not registered yet, that's fine - index.html handles it
    });
  }
}

// Start the app
initApp();