import { Home, Calendar, Search, BookOpen, FileText } from 'lucide-react';
import { NavPage } from '../types/navigation';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

interface BottomNavigationProps {
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  hasUnreadNotifications: boolean;
  todayTaskCount?: number;
}

// Optimized navigation item with minimal rendering
const BottomNavigationItem = React.memo(({ 
  id, 
  icon: Icon, 
  label, 
  ariaLabel, 
  isActive, 
  onClick, 
  badge 
}: { 
  id: NavPage; 
  icon: React.ElementType; 
  label: string; 
  ariaLabel: string; 
  isActive: boolean; 
  onClick: () => void; 
  badge?: number;
}) => {
  return (
    <button
      onClick={() => {
        onClick();
        // Only vibrate on devices that support it
        if ('vibrate' in navigator) {
          navigator.vibrate(5);
        }
      }}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      className={`
        relative flex flex-col items-center justify-center w-full
        px-1 py-1 
        ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300'
        }`}
    >
      <div className="relative">
        <Icon 
          className="w-5 h-5"
          strokeWidth={isActive ? 2.5 : 1.8}
        />
        
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 text-[9px] font-medium text-white bg-red-500 rounded-full flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      
      <span className={`text-[10px] mt-0.5 ${isActive ? 'font-medium' : 'font-normal opacity-70'}`}>
        {label}
      </span>
    </button>
  );
});

BottomNavigationItem.displayName = 'BottomNavigationItem';

export function BottomNavigation({ activePage, onPageChange, hasUnreadNotifications, todayTaskCount = 0 }: BottomNavigationProps) {
  // Remove isMobile state as we'll use CSS media queries instead
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  
  // Pre-define nav items once to avoid recreating the array on each render
  const navItems = useMemo(() => [
    { id: 'home' as NavPage, icon: Home, label: 'Home', ariaLabel: 'Go to home page', badge: undefined },
    { id: 'upcoming' as NavPage, icon: Calendar, label: 'Upcoming', ariaLabel: 'View upcoming tasks', badge: todayTaskCount > 0 ? todayTaskCount : undefined },
    { id: 'lecture-slides' as NavPage, icon: FileText, label: 'Slides', ariaLabel: 'View lecture slides', badge: undefined },
    { id: 'search' as NavPage, icon: Search, label: 'Search', ariaLabel: 'Search content', badge: undefined }
  ], [todayTaskCount]);

  // Handle keyboard navigation - simplified
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is on an input element
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const currentIndex = navItems.findIndex(item => item.id === activePage);
      
      if (e.key === 'ArrowRight' && currentIndex < navItems.length - 1) {
        onPageChange(navItems[currentIndex + 1].id);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onPageChange(navItems[currentIndex - 1].id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, onPageChange, navItems]);

  // Optimized touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    // Require more significant swipe (70px)
    if (Math.abs(diff) < 70) return;
    
    const currentIndex = navItems.findIndex(item => item.id === activePage);
    
    // Swipe right to left (next)
    if (diff > 0 && currentIndex < navItems.length - 1) {
      onPageChange(navItems[currentIndex + 1].id);
    } 
    // Swipe left to right (previous)
    else if (diff < 0 && currentIndex > 0) {
      onPageChange(navItems[currentIndex - 1].id);
    }
    
    setTouchStartX(null);
  }, [touchStartX, activePage, onPageChange, navItems]);

  const activeIndex = navItems.findIndex(item => item.id === activePage);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 h-[50px]">
          {/* Active indicator line - simplified styling */}
          <div className="absolute top-0 h-0.5 bg-blue-500 dark:bg-blue-400 transition-all duration-150" 
            style={{
              width: `${100 / navItems.length}%`,
              left: `${(100 / navItems.length) * activeIndex}%`,
            }}
          />

          {navItems.map(({ id, icon, label, ariaLabel, badge }) => (
            <BottomNavigationItem
              key={id}
              id={id}
              icon={icon}
              label={label}
              ariaLabel={ariaLabel}
              isActive={activePage === id}
              onClick={() => onPageChange(id)}
              badge={badge}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}