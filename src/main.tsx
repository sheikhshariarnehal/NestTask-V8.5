import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
// Import Ionic CSS for pull-to-refresh and other components
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
// Import CSS (Vite handles this correctly)
import './index.css';
import { MicroLoader } from './components/MicroLoader';
import { initPWA } from './utils/pwa';
import { supabase } from './lib/supabase';
import type { LoginCredentials, SignupCredentials } from './types/auth';
import { initPushNotificationListeners } from './services/pushNavigationService';

// Prefetch critical modules during idle time
const prefetchModules = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./App');
      import('./pages/AuthPage');
    });
  }
};

// Start prefetching immediately
prefetchModules();

// Lazy-load core pages with chunk names for better caching
const App = lazy(() => import(/* webpackChunkName: "app" */ './App'));
const ResetPasswordPage = lazy(() => import(/* webpackChunkName: "reset-password" */ './pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthPage = lazy(() => import(/* webpackChunkName: "auth" */ './pages/AuthPage').then(module => ({ default: module.AuthPage })));

// Ensure environment variables are properly loaded in production
if (import.meta.env.PROD) {
  console.log('[Debug] Running in production mode - checking environment variables');
  // Check if we need to add environment variables to window for runtime access
  if (!import.meta.env.VITE_SUPABASE_URL && !((window as any).ENV_SUPABASE_URL)) {
    console.error('[Error] Missing Supabase URL in production environment');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !((window as any).ENV_SUPABASE_ANON_KEY)) {
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
    element: (
      <Suspense fallback={<MicroLoader />}>
        <AuthPage
          onLogin={async (credentials: LoginCredentials, _rememberMe?: boolean) => {
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              });
              if (error) throw error;
            } catch (error) {
              throw error;
            }
          }}
          onSignup={async (credentials: SignupCredentials) => {
            try {
              const { error } = await supabase.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                options: { data: { name: credentials.name } }
              });
              if (error) throw error;
            } catch (error) {
              throw error;
            }
          }}
          onForgotPassword={async (email: string) => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) throw error;
            } catch (error) {
              throw error;
            }
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
    } catch (e) {
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
            <Suspense fallback={null}><Analytics /></Suspense>
          </AnalyticsErrorBoundary>
        )}
      </Suspense>
    </StrictMode>
  );
  
  // Initialize PWA features (service worker registered in index.html)
  // Only initialize PWA utilities here, don't double-register SW
  if ('serviceWorker' in navigator) {
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