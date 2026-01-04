import { AlertCircle } from 'lucide-react';

interface AuthErrorProps {
  message: string;
}

export function AuthError({ message }: AuthErrorProps) {
  return (
    <div className="mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span className="text-xs sm:text-sm flex-1">{message}</span>
    </div>
  );
}