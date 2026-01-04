import { LucideIcon } from 'lucide-react';

export interface AuthSubmitButtonProps {
  label: string;
  isLoading?: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
}

export function AuthSubmitButton({ 
  label, 
  isLoading = false, 
  icon: Icon,
  disabled = false
}: AuthSubmitButtonProps) {
  const isDisabled = isLoading || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`
        w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold 
        transition-all duration-200
        text-sm sm:text-base
        ${isDisabled 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow dark:bg-blue-600 dark:hover:bg-blue-500 active:transform active:scale-[0.99]'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
      `}
    >
      {Icon && <Icon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />}
      <span>{label}</span>
    </button>
  );
}