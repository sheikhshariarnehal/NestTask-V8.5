import { useState, useCallback, useEffect, useRef } from 'react';
import { ProfileMenu } from './profile/ProfileMenu';
import { Moon, Sun, Calendar, WifiOff } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
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
  const isOffline = useOfflineStatus();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      <nav className="relative z-50">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="flex justify-between items-center h-12 sm:h-14">
              {/* Logo and Brand */}
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent transition-all duration-300">
                    NestTask
                  </h1>
                  {isOffline && (
                    <div className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400"></div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tracking-wide">Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section - Action Icons */}
              <div className="flex items-center">
                {/* Mobile-optimized icons with improved alignment and spacing */}
                <div className="inline-flex items-center justify-center bg-gray-50/30 dark:bg-gray-800/30 rounded-xl px-1.5 py-1 gap-2.5 sm:gap-3 md:gap-4">
                  {/* Theme Toggle Button */}
                  <button
                    onClick={toggle}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/50 active:scale-95"
                    aria-label="Toggle theme"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500" strokeWidth={1.75} />
                    ) : (
                      <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-600" strokeWidth={1.75} />
                    )}
                  </button>

                  {/* Calendar Button */}
                  <button
                    onClick={handleCalendarToggle}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/50 active:scale-95"
                    aria-label="Show calendar"
                  >
                    <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
                  </button>

                  {/* Profile Menu */}
                  <ProfileMenu onLogout={onLogout} />
                </div>
              </div>
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