import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import type { LoginCredentials, SignupCredentials } from '../types/auth';
import { CheckCircle2, Users, Layout } from 'lucide-react';

interface AuthPageProps {
  onLogin: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  onSignup: (credentials: SignupCredentials) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  error?: string;
}

export function AuthPage({ onLogin, onSignup, onForgotPassword, error }: AuthPageProps) {
  const [authState, setAuthState] = useState<'login' | 'signup' | 'forgot-password'>('login');

  return (
    <div className="h-screen w-full flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Side - Hero/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-blue-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900" />
        {/* Decorative pattern instead of external image to avoid ORB blocking */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between h-full p-16 text-white">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <img 
                src="/icons/icon-512x512.png" 
                alt="NestTask Logo" 
                className="w-[30px] h-[30px] rounded-lg shadow-lg shrink-0 object-contain" 
              />
              <span className="text-3xl font-bold tracking-tight text-white leading-none">NestTask</span>
            </div>
            
            <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
              Manage your academic <br/>
              <span className="text-blue-200">journey with ease.</span>
            </h1>
            <p className="text-lg text-blue-100 max-w-md leading-relaxed">
              Streamline your tasks, track your progress, and collaborate with peers in one unified platform designed for students.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors duration-300">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Task Tracking</h3>
                <p className="text-sm text-blue-200">Stay on top of assignments and deadlines</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors duration-300">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Collaboration</h3>
                <p className="text-sm text-blue-200">Work together with classmates seamlessly</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-blue-200/60">
            © {new Date().getFullYear()} NestTask. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 relative">
        <div className="absolute inset-0 overflow-y-auto safe-area-inset-bottom">
          <div className="min-h-full flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
            <div className="mx-auto w-full max-w-md">
                {/* Mobile Header - Only show on Login */}
                {authState === 'login' && (
                  <div className="lg:hidden flex flex-col items-center mb-8 sm:mb-10">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <img 
                          src="/icons/icon-512x512.png" 
                          alt="NestTask Logo" 
                          className="w-[30px] h-[30px] rounded-lg shrink-0 object-contain" 
                        />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">NestTask</h1>
                      </div>
                  </div>
                )}

                {authState === 'login' && (
                  <LoginForm
                    onSubmit={onLogin}
                    onSwitchToSignup={() => setAuthState('signup')}
                    onForgotPassword={() => setAuthState('forgot-password')}
                    error={error}
                  />
                )}
                {authState === 'signup' && (
                  <SignupForm
                    onSubmit={onSignup}
                    onSwitchToLogin={() => setAuthState('login')}
                    error={error}
                  />
                )}
                {authState === 'forgot-password' && (
                  <ForgotPasswordForm
                    onSubmit={onForgotPassword}
                    onBackToLogin={() => setAuthState('login')}
                    error={error}
                  />
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}