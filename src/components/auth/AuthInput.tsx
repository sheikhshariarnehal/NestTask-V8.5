import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface AuthInputProps {
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  error?: string;
  required?: boolean;
  rightElement?: ReactNode;
  autocomplete?: string;
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

export function AuthInput({
  type,
  value,
  onChange,
  label,
  placeholder,
  icon: Icon,
  error,
  required = true,
  rightElement,
  autocomplete,
  inputMode
}: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full pl-10 ${rightElement ? 'pr-10' : 'pr-4'} py-3 sm:py-2.5 rounded-lg transition-all duration-200
            border
            ${error 
              ? 'border-red-300 dark:border-red-500/50 bg-red-50/30 dark:bg-red-900/10 focus:ring-2 focus:ring-red-100 focus:border-red-500' 
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 dark:focus:ring-blue-900/20'
            }
            text-base sm:text-sm text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          `}
          placeholder={placeholder}
          required={required}
          autoComplete={autocomplete}
          inputMode={inputMode}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
          <span className="inline-block mt-0.5">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}