import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Application Error
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              Something went wrong. Please try refreshing the page.
            </p>
            
            {this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-mono text-red-800 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Show error details (dev mode)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error boundary specifically for environment variable errors
export const EnvErrorFallback = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/20 rounded-full mb-6">
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
          Configuration Required
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          The application is missing required environment variables. Please configure the following:
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-red-500 mt-0.5">✗</span>
            <div className="flex-1">
              <code className="text-sm font-mono text-gray-800 dark:text-gray-200">VITE_SUPABASE_URL</code>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your Supabase project URL</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500 mt-0.5">✗</span>
            <div className="flex-1">
              <code className="text-sm font-mono text-gray-800 dark:text-gray-200">VITE_SUPABASE_ANON_KEY</code>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your Supabase anonymous key</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">For Vercel Deployment:</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Go to your Vercel project dashboard</li>
            <li>Navigate to Settings → Environment Variables</li>
            <li>Add the required variables</li>
            <li>Redeploy your application</li>
          </ol>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">For Local Development:</h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            Create a <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">.env.local</code> file with:
          </p>
          <pre className="text-xs font-mono bg-amber-100 dark:bg-amber-900 p-2 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here`}
          </pre>
        </div>
      </div>
    </div>
  );
};
