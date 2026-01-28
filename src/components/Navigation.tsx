import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { ProfileMenu } from './profile/ProfileMenu';
import { Moon, Sun, Calendar, LayoutGrid } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { MonthlyCalendar } from './MonthlyCalendar';
import type { NavPage } from '../types/navigation';
import type { Task } from '../types/task';

interface NavigationProps {
  onLogout: () => void;
  hasUnreadNotifications: boolean;
  onNotificationsClick: () => void;
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  taskStats: {
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  tasks: Task[];
}

// Memoized action button component for consistent styling and touch optimization
const ActionButton = memo(({ 
  onClick, 
  ariaLabel, 
  isActive = false,
  children 
}: { 
  onClick: () => void; 
  ariaLabel: string; 
  isActive?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center justify-center 
      w-10 h-10 sm:w-11 sm:h-11
      rounded-xl
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
      active:scale-[0.92] active:opacity-80
      ${isActive 
        ? 'bg-blue-50 dark:bg-blue-900/30 shadow-sm' 
        : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:shadow-sm'
      }
    `}
    style={{
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none',
      userSelect: 'none',
    }}
    aria-label={ariaLabel}
  >
    {children}
  </button>
));

ActionButton.displayName = 'ActionButton';

export function Navigation({ 
  onLogout, 
  hasUnreadNotifications, 
  onNotificationsClick,
  activePage,
  onPageChange,
  user,
  taskStats,
  tasks = []
}: NavigationProps) {
  const { isDark, toggle } = useTheme();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for header shadow effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 8;
      if (scrolled !== isScrolled) {
        setIsScrolled(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  const handleCalendarToggle = useCallback(() => {
    setIsCalendarOpen(prev => !prev);
  }, []);

  // Memoized date select handler to prevent re-creation on every render
  const handleDateSelect = useCallback((date: Date) => {
    // Update local state
    setSelectedDate(date);
    setIsCalendarOpen(false);
    
    // Always navigate to upcoming page
    onPageChange('upcoming');
    
    try {
      // Optimize date formatting
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // Format with zero padding
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Update URL with date parameter
      const params = new URLSearchParams(window.location.search);
      params.set('selectedDate', formattedDate);
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl, date: formattedDate }, '', newUrl);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('dateSelected', { detail: { date } }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Navigation: Selected date and updated URL', formattedDate);
      }
    } catch (error) {
      console.error('Error setting date parameter:', error);
    }
  }, [onPageChange]);

  // Memoized close handler
  const handleCalendarClose = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  return (
    <>
      <nav 
        className={`
          sticky top-0 z-50 
          bg-white/95 dark:bg-gray-900/95
          backdrop-blur-xl backdrop-saturate-150
          border-b transition-all duration-300 ease-out
          ${isScrolled 
            ? 'border-gray-200/80 dark:border-gray-700/80 shadow-lg shadow-gray-900/5 dark:shadow-gray-900/20' 
            : 'border-gray-100 dark:border-gray-800/50 shadow-sm'
          }
        `}
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand - Enhanced with icon */}
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-2.5">
              {/* App Icon */}
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 dark:shadow-blue-500/15">
                <img 
                  src="/icons/icon-192x192.png" 
                  alt="NestTask Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Brand Name */}
              <div className="flex flex-col justify-center items-center self-center">
                <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none m-0">
                  NestTask
                </h1>
                <span className="hidden sm:block text-[9px] md:text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase leading-none mt-1">
                  Task Manager
                </span>
              </div>
            </div>

            {/* Right Section - Action Icons with improved touch targets */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Action buttons container with subtle background */}
              <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
                {/* Theme Toggle Button */}
                <ActionButton onClick={toggle} ariaLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}>
                  <div className="relative">
                    {isDark ? (
                      <Sun 
                        className="w-5 h-5 text-amber-500 transition-transform duration-300" 
                        strokeWidth={2} 
                      />
                    ) : (
                      <Moon 
                        className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-transform duration-300" 
                        strokeWidth={2} 
                      />
                    )}
                  </div>
                </ActionButton>

                {/* Calendar Button */}
                <ActionButton 
                  onClick={handleCalendarToggle} 
                  ariaLabel="Open calendar"
                  isActive={isCalendarOpen}
                >
                  <Calendar 
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isCalendarOpen 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} 
                    strokeWidth={2} 
                  />
                </ActionButton>

                {/* Apps Menu Button */}
                <ActionButton 
                  onClick={() => onPageChange('apps')} 
                  ariaLabel="Open apps page"
                  isActive={activePage === 'apps'}
                >
                  <LayoutGrid 
                    className={`w-5 h-5 transition-colors duration-200 ${
                      activePage === 'apps' 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} 
                    strokeWidth={2} 
                  />
                </ActionButton>
              </div>

              {/* Vertical Divider */}
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2" />

              {/* Profile Menu - Slightly larger for better touch */}
              <ProfileMenu onLogout={onLogout} />
            </div>
          </div>
        </div>
      </nav>

      {/* Monthly Calendar */}
      <MonthlyCalendar
        isOpen={isCalendarOpen}
        onClose={handleCalendarClose}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
        tasks={tasks}
      />
    </>
  );
}