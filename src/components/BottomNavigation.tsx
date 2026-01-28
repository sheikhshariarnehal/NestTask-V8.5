import { Home, Calendar, Search, BookOpen, FileText, Clock } from 'lucide-react';
import { NavPage } from '../types/navigation';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';

interface BottomNavigationProps {
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  hasUnreadNotifications: boolean;
  todayTaskCount?: number;
}

// Optimized navigation item with minimal rendering - Enhanced for mobile
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
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      className={`
        relative flex flex-col items-center justify-center w-full
        px-1 py-2 
        transition-all duration-150 ease-out
        active:scale-95 active:opacity-80
        ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      style={{
        contain: 'layout style paint',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <div className="relative flex items-center justify-center">
        <Icon 
          className={`w-[22px] h-[22px] transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}
          strokeWidth={isActive ? 2.25 : 1.75}
          style={{ willChange: isActive ? 'transform' : 'auto' }}
        />
        
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      
      <span className={`text-[11px] mt-1 tracking-tight ${isActive ? 'font-semibold' : 'font-medium opacity-80'}`}>
        {label}
      </span>
    </button>
  );
});

BottomNavigationItem.displayName = 'BottomNavigationItem';

export function BottomNavigation({ activePage, onPageChange, hasUnreadNotifications, todayTaskCount = 0 }: BottomNavigationProps) {
  const touchStartXRef = useRef<number | null>(null);
  
  // Pre-define nav items once to avoid recreating the array on each render
  const navItems = useMemo(() => [
    { id: 'home' as NavPage, icon: Home, label: 'Home', ariaLabel: 'Go to home page', badge: undefined },
    { id: 'upcoming' as NavPage, icon: Calendar, label: 'Upcoming', ariaLabel: 'View upcoming tasks', badge: todayTaskCount > 0 ? todayTaskCount : undefined },
    { id: 'routine' as NavPage, icon: Clock, label: 'Routine', ariaLabel: 'View routine', badge: undefined },
    { id: 'search' as NavPage, icon: Search, label: 'Search', ariaLabel: 'Search content', badge: undefined }
  ], [todayTaskCount]);

  const activeIndex = useMemo(() => navItems.findIndex(item => item.id === activePage), [navItems, activePage]);

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

  // Optimized touch handlers - using ref to avoid re-renders
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    
    // Require more significant swipe (70px)
    if (Math.abs(diff) < 70) {
      touchStartXRef.current = null;
      return;
    }
    
    // Swipe right to left (next)
    if (diff > 0 && activeIndex < navItems.length - 1) {
      onPageChange(navItems[activeIndex + 1].id);
    } 
    // Swipe left to right (previous)
    else if (diff < 0 && activeIndex > 0) {
      onPageChange(navItems[activeIndex - 1].id);
    }
    
    touchStartXRef.current = null;
  }, [activeIndex, onPageChange, navItems]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-900/10 dark:shadow-gray-900/40"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        transform: 'translate3d(0, 0, 0)',
        contain: 'layout style paint',
        willChange: 'transform'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="grid grid-cols-4 h-[56px] relative">
          {/* Active indicator line - smoother animation */}
          <div 
            className="absolute top-0 h-[3px] bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full transition-transform duration-200 ease-out" 
            style={{
              width: `calc(${100 / navItems.length}% - 16px)`,
              marginLeft: '8px',
              transform: `translate3d(calc(${100 * activeIndex}% + ${activeIndex * 16}px), 0, 0)`,
              backfaceVisibility: 'hidden',
              willChange: 'transform'
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