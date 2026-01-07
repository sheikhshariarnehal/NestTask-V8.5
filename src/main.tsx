import React, { StrictMode, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// Import CSS (Vite handles this correctly)
import './index.css';
import { MicroLoader } from './components/MicroLoader';
import { initPWA } from './utils/pwa';
import { supabase } from './lib/supabase';
import type { LoginCredentials, SignupCredentials } from './types/auth';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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

// Conditionally import Analytics and Speed Insights only in production
const Analytics = import.meta.env.PROD 
  ? lazy(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })))
  : () => null;

const SpeedInsights = import.meta.env.PROD 
  ? lazy(() => import('@vercel/speed-insights/react').then(mod => ({ default: mod.SpeedInsights })))
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
  try {
    // Add DNS prefetch for critical domains
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        const url = new URL(import.meta.env.VITE_SUPABASE_URL);
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = url.origin;
        document.head.appendChild(link);
      } catch (e) {
        console.warn('DNS prefetch failed:', e);
      }
    }
    
    // Get root element and create React root
    const root = document.getElementById('root');
    if (!root) {
      console.error('Root element not found!');
      return;
    }
    
    const reactRoot = createRoot(root);
    
    // Render app with error boundary
    reactRoot.render(
      <StrictMode>
        <ErrorBoundary>
          <Suspense fallback={<MicroLoader />}>
            <RouterProvider router={router} />
            {import.meta.env.PROD && (
              <AnalyticsErrorBoundary>
                <Suspense fallback={null}>
                  <Analytics />
                  <SpeedInsights />
                </Suspense>
              </AnalyticsErrorBoundary>
            )}
          </Suspense>
        </ErrorBoundary>
      </StrictMode>
    );
    
    // Initialize PWA features
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(() => {
            console.log('Service worker registered successfully');
            // Initialize PWA features after service worker is registered
            setTimeout(() => initPWA(), 1000);
          })
          .catch(error => console.error('SW registration failed:', error));
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Show error in DOM if React fails to mount
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
          <h1 style="font-size: 24px; margin-bottom: 16px; color: #ef4444;">Failed to load application</h1>
          <p style="margin-bottom: 16px; color: #6b7280;">Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()" style="padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Reload Page</button>
        </div>
      `;
    }
  }
}

// Start the app
initApp();