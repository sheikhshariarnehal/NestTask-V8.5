import { memo } from 'react';
import { Home, Calendar, Clock, Search, FileText, User, LayoutGrid, ChevronRight, Sparkles, Star } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import type { NavPage } from '../types/navigation';

interface AppsPageProps {
  onPageChange: (page: NavPage) => void;
}

const apps = [
  {
    id: 'home' as NavPage,
    name: 'Home',
    description: 'Task dashboard & overview',
    icon: Home,
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    featured: true,
  },
  {
    id: 'upcoming' as NavPage,
    name: 'Upcoming',
    description: 'Scheduled tasks & deadlines',
    icon: Calendar,
    gradient: 'from-purple-500 to-pink-600',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    featured: true,
  },
  {
    id: 'routine' as NavPage,
    name: 'Routine',
    description: 'Daily schedule & habits',
    icon: Clock,
    gradient: 'from-orange-500 to-red-600',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/20',
    featured: false,
  },
  {
    id: 'search' as NavPage,
    name: 'Search',
    description: 'Find tasks & content',
    icon: Search,
    gradient: 'from-green-500 to-teal-600',
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-900/20',
    featured: false,
  },
  {
    id: 'lecture-slides' as NavPage,
    name: 'Slides',
    description: 'Study materials & resources',
    icon: FileText,
    gradient: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-900/20',
    featured: false,
  },
  {
    id: 'profile' as NavPage,
    name: 'Profile',
    description: 'Account & preferences',
    icon: User,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    bgDark: 'dark:bg-violet-900/20',
    featured: false,
  },
];

// Featured app card - larger, more prominent
const FeaturedAppCard = memo(({ app, onPageChange }: { app: typeof apps[0]; onPageChange: (page: NavPage) => void }) => {
  const Icon = app.icon;
  
  return (
    <Card 
      className="
        group relative overflow-hidden cursor-pointer
        border-2 border-transparent
        hover:border-gray-200 dark:hover:border-gray-700
        hover:shadow-xl
        active:scale-[0.98]
        transition-all duration-200
      "
      onClick={() => onPageChange(app.id)}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${app.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 
            rounded-2xl bg-gradient-to-br ${app.gradient} 
            flex items-center justify-center 
            shadow-lg group-hover:shadow-xl group-hover:scale-105 
            transition-all duration-200
          `}>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={1.75} />
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/25 to-transparent" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {app.name}
              </h3>
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {app.description}
            </p>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-3" />
        </div>
      </CardContent>
    </Card>
  );
});

FeaturedAppCard.displayName = 'FeaturedAppCard';

// Regular app card - compact grid item
const AppCard = memo(({ app, onPageChange }: { app: typeof apps[0]; onPageChange: (page: NavPage) => void }) => {
  const Icon = app.icon;
  
  return (
    <Card 
      className="
        group relative overflow-hidden cursor-pointer
        border-2 border-transparent
        hover:border-gray-200 dark:hover:border-gray-700
        hover:shadow-lg
        active:scale-[0.97]
        transition-all duration-200
      "
      onClick={() => onPageChange(app.id)}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Icon */}
          <div className={`
            relative w-12 h-12 sm:w-14 sm:h-14 
            rounded-xl bg-gradient-to-br ${app.gradient} 
            flex items-center justify-center 
            shadow-md group-hover:shadow-lg group-hover:scale-110 
            transition-all duration-200
          `}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.75} />
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
          </div>
          
          {/* Content */}
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {app.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {app.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

AppCard.displayName = 'AppCard';

export const AppsPage = memo(({ onPageChange }: AppsPageProps) => {
  const featuredApps = apps.filter(app => app.featured);
  const otherApps = apps.filter(app => !app.featured);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                All Apps
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Quick access to all features
              </p>
            </div>
          </div>
        </div>

        {/* Featured Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Featured
            </h2>
          </div>
          <div className="space-y-3">
            {featuredApps.map((app) => (
              <FeaturedAppCard key={app.id} app={app} onPageChange={onPageChange} />
            ))}
          </div>
        </div>

        <Separator className="my-6 sm:my-8" />

        {/* All Apps Grid */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <LayoutGrid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              All Apps
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {otherApps.map((app) => (
              <AppCard key={app.id} app={app} onPageChange={onPageChange} />
            ))}
          </div>
        </div>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 sm:h-8" />
      </div>
    </div>
  );
});

AppsPage.displayName = 'AppsPage';
