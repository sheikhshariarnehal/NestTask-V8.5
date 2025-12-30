import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// Import CSS (Vite handles this correctly)
import './index.css';
import { MicroLoader } from './components/MicroLoader';
import { initPWA } from './utils/pwa';
import { supabase } from './lib/supabase';
import type { LoginCredentials, SignupCredentials } from './types/auth';

// Lazy-load core pages
const App = lazy(() => import('./App'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));

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

// Simple error boundary for analytics
const AnalyticsErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  if (!import.meta.env.PROD) return null;
  return <>{children}</>;
};

// Define app routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<MicroLoader />}><App /></Suspense>,
    children: []
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<MicroLoader />}>
        <AuthPage 
          onLogin={async (credentials: LoginCredentials, rememberMe?: boolean) => {
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
  }
]);

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
        {import.meta.env.PROD && (
          <AnalyticsErrorBoundary>
            <Suspense fallback={null}><Analytics /></Suspense>
          </AnalyticsErrorBoundary>
        )}
      </Suspense>
    </StrictMode>
  );
  
  // Initialize PWA features
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => {
          // Initialize PWA features after service worker is registered
          setTimeout(() => initPWA(), 1000);
        })
        .catch(error => console.error('SW registration failed:', error));
    });
  }
}

// Start the app
initApp();