import React from 'react';
import { Menu, X } from 'lucide-react';

interface MobileMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const MobileMenuButton = React.memo(function MobileMenuButton({ 
  isOpen, 
  onClick 
}: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-md 
        transition-all duration-300 transform will-change-transform
        ${isOpen 
          ? 'bg-white dark:bg-gray-800 rotate-0' 
          : 'bg-gradient-to-r from-blue-600 to-indigo-600'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50
      `}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? (
        <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Menu className="w-5 h-5 text-white" />
      )}
    </button>
  );
});