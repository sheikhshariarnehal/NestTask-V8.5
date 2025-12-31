import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { AuthError } from './AuthError';
import { AuthInput } from './AuthInput';
import { AuthSubmitButton } from './AuthSubmitButton';
import { validateEmail } from '../../utils/authErrors';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  error?: string;
}

export function ForgotPasswordForm({ onSubmit, onBackToLogin, error }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false });

  const validateForm = () => {
    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSubmit(email);
      setSuccessMessage('Password reset link sent to your email');
      setEmail('');
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setEmail(value);
    setTouched(prev => ({ ...prev, email: true }));
    setLocalError(null);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!successMessage ? (
        <>
          <div className="mb-8">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Forgot Password?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No worries, we'll send you reset instructions.
            </p>
          </div>
          
          {(error || localError) && <AuthError message={error || localError || ''} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              type="email"
              value={email}
              onChange={handleInputChange}
              label="Email"
              placeholder="Enter your email"
              icon={Mail}
              error={touched.email && !validateEmail(email) ? 'Please enter a valid email' : ''}
              inputMode="email"
            />

            <AuthSubmitButton 
              label={isLoading ? 'Sending...' : 'Send Reset Link'} 
              isLoading={isLoading}
              icon={isLoading ? Loader2 : undefined}
              disabled={!email || (touched.email && !validateEmail(email))}
            />
          </form>
        </>
      ) : (
        <div className="text-center py-5">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-6 ring-8 ring-green-50/50 dark:ring-green-900/10">
            <MailCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your inbox</h3>
          <p className="mb-8 text-gray-600 dark:text-gray-400 leading-relaxed">
            We've sent a password reset link to <span className="font-semibold text-gray-900 dark:text-white">{email || 'your email'}</span>. 
            Please check your inbox and follow the instructions.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.open('mailto:', '_blank')}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Open Email App
            </button>
            
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Try another email
            </button>
            
            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-4 inline-flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 