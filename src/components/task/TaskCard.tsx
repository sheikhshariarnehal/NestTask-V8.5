import { Task } from '../../types';
import { memo, useMemo, lazy, Suspense } from 'react';
import { isOverdue } from '../../utils/dateUtils';
import { parseLinks } from '../../utils/linkParser';
// Import only the icons we definitely need immediately
import { Calendar } from 'lucide-react';

// Add lightweight CSS animation - defined once and reused
const pulseAnimation = `
  @keyframes simplePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .animate-pulse-light {
    animation: simplePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Lazily load the category icons - shared across all instances
const iconMap = {
  quiz: lazy(() => import('lucide-react').then(mod => ({ default: mod.BookOpen }))),
  assignment: lazy(() => import('lucide-react').then(mod => ({ default: mod.PenSquare }))),
  presentation: lazy(() => import('lucide-react').then(mod => ({ default: mod.Presentation }))),
  project: lazy(() => import('lucide-react').then(mod => ({ default: mod.Folder }))),
  labreport: lazy(() => import('lucide-react').then(mod => ({ default: mod.Beaker }))),
  labfinal: lazy(() => import('lucide-react').then(mod => ({ default: mod.Microscope }))),
  labperformance: lazy(() => import('lucide-react').then(mod => ({ default: mod.Activity }))),
  documents: lazy(() => import('lucide-react').then(mod => ({ default: mod.FileText }))),
  blc: lazy(() => import('lucide-react').then(mod => ({ default: mod.Building }))),
  groups: lazy(() => import('lucide-react').then(mod => ({ default: mod.Users }))),
  default: lazy(() => import('lucide-react').then(mod => ({ default: mod.GraduationCap })))
};

// Single regex for more efficient text cleaning
const CLEAN_REGEX = new RegExp(
  [
    /\*This task is assigned to section ID: [0-9a-f-]+\*/,
    /\n\nFor section: [0-9a-f-]+/,
    /\n\n\*\*Attachments:\*\*[\s\S]*?((\n\n)|$)/,
    /\[.*?\]\(attachment:.*?\)/,
    /\nAttached Files:[\s\S]*?((\n\n)|$)/,
    /\s*\[(data_analysis_report.*?)\]\s*/
  ].map(r => r.source).join('|'),
  'g'
);

// Helper function to clean the task description for display in cards
const cleanDescription = (description: string) => {
  if (!description) return '';
  return description.replace(CLEAN_REGEX, '').trim();
};

// Static maps for colors and styles - shared across all instances
const categoryColorMap: Record<string, string> = {
  'quiz': 'text-blue-600 dark:text-blue-400',
  'assignment': 'text-orange-600 dark:text-orange-400',
  'presentation': 'text-red-600 dark:text-red-400',
  'project': 'text-indigo-600 dark:text-indigo-400',
  'lab-report': 'text-green-600 dark:text-green-400',
  'lab-final': 'text-purple-600 dark:text-purple-400',
  'lab-performance': 'text-pink-600 dark:text-pink-400',
  'documents': 'text-yellow-600 dark:text-yellow-400',
  'blc': 'text-cyan-600 dark:text-cyan-400',
  'groups': 'text-teal-600 dark:text-teal-400',
  'default': 'text-gray-600 dark:text-gray-400'
};

// Predefined status color variables to avoid recalculations
const statusColors = {
  completed: 'bg-green-500',
  overdue: 'bg-red-500', 
  default: 'bg-sky-500'
};

const statusStyleMap = {
  completed: {
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: statusColors.completed,
    cardStyle: 'md:border-green-200 md:dark:border-green-900/80 bg-green-50 dark:bg-gray-800 md:bg-white md:dark:bg-gray-800'
  },
  overdue: {
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: statusColors.overdue,
    cardStyle: 'md:border-red-200 md:dark:border-red-900/80 bg-red-50 dark:bg-gray-800 md:bg-white md:dark:bg-gray-800'
  },
  default: {
    textColor: 'text-sky-600 dark:text-sky-400',
    bgColor: statusColors.default,
    cardStyle: 'md:border-sky-100 md:dark:border-sky-800/30 md:hover:border-sky-200 md:dark:hover:border-sky-700/50'
  }
};

// Helper functions for efficient category handling
const getCategoryColor = (category: string) => {
  const key = category.toLowerCase();
  return categoryColorMap[key] || categoryColorMap.default;
};

// Optimized lightweight status indicator dot component
const StatusDot = memo(({ status, overdue }: { status: string; overdue: boolean }) => {
  // Determine status class efficiently
  let statusClass = 'status-dot-default';
  
  if (status === 'completed') {
    statusClass = 'status-dot-completed';
  } else if (overdue) {
    statusClass = 'status-dot-overdue';
  }
  
  // Single optimized class with CSS-based animation
  return <span className={`status-dot ${statusClass}`} />;
});

// Create a lightweight icon component
const CategoryIcon = memo(({ category, className = "w-3.5 h-3.5" }: { category: string; className?: string }) => {
  // Normalize the key by removing hyphens for better matching
  const key = category.toLowerCase().replace(/-/g, '') as keyof typeof iconMap;
  const IconComponent = iconMap[key] || iconMap.default;

  return (
    <Suspense fallback={<div className={className} />}>
      <IconComponent className={className} />
    </Suspense>
  );
});

interface TaskCardProps {
  task: Task;
  index: number;
  onSelect: (task: Task) => void;
}

// Optimized task card component with proper memoization
export const TaskCard = memo(({ 
  task, 
  index, 
  onSelect 
}: TaskCardProps) => {
  // Inject the animation styles once when component mounts
  useMemo(() => {
    // Only inject if not already present
    if (!document.getElementById('pulse-animation-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'pulse-animation-style';
      styleEl.textContent = pulseAnimation;
      document.head.appendChild(styleEl);
    }
  }, []);

  // These should be fast calculations, so we can do them directly
  const overdue = isOverdue(task.dueDate);
  const formattedCategory = task.category.replace(/-/g, ' ');
  const categoryColor = getCategoryColor(task.category);
  
  // Get status styles from our map for consistent rendering
  const statusStyle = useMemo(() => {
    if (task.status === 'completed') return statusStyleMap.completed;
    if (overdue) return statusStyleMap.overdue;
    return statusStyleMap.default;
  }, [task.status, overdue]);
  
  // These are more expensive, so we memoize them
  const cleanedDescription = useMemo(() => 
    task.description ? cleanDescription(task.description) : '', 
    [task.description]
  );
  
  // Only parse links if there's a cleaned description and it potentially contains links
  const parsedLinks = useMemo(() => 
    cleanedDescription && cleanedDescription.includes('http') ? parseLinks(cleanedDescription) : [],
    [cleanedDescription]
  );
  
  // Pre-format date once
  const formattedDate = useMemo(() => {
    try {
      return new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'No date';
    }
  }, [task.dueDate]);

  // More efficient animation delay calculation
  const animationDelay = `${Math.min(index * 30, 200)}ms`;

  return (
    <div
      onClick={() => onSelect(task)}
      className={`task-card-base ${
        task.status === 'completed' ? 'task-card-completed' :
        overdue ? 'task-card-overdue' : ''
      } motion-safe:animate-fade-in`}
      style={{ 
        animationDelay,
        animationDuration: '500ms'
      }}
    >
      {/* Task Content */}
      <div className="space-y-2">
        {/* Title and Tag Row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base md:text-sm font-semibold
            text-gray-900 dark:text-gray-100
            leading-snug
            line-clamp-2
            break-words flex-1"
          >
            {task.name}
          </h3>

          {/* Small Tag - Right Aligned */}
          <span className={`inline-flex items-center gap-1
            px-1.5 py-0.5
            rounded-md text-[10px] font-bold uppercase tracking-wider
            bg-gray-50 dark:bg-gray-700/50
            border border-gray-200 dark:border-gray-600/50
            flex-shrink-0 mt-0.5
            ${categoryColor}`}
          >
            <CategoryIcon category={task.category} className="w-2.5 h-2.5 hidden md:inline-block" />
            <span className="truncate max-w-[70px] md:max-w-[90px]">
              {formattedCategory}
            </span>
          </span>
        </div>

        {/* Always show description - responsive line clamping */}
        {cleanedDescription && (
          <p className="text-sm
            text-gray-600 dark:text-gray-400
            leading-relaxed
            line-clamp-2 md:line-clamp-1
            break-words"
          >
            {parsedLinks.length > 0 ?
              parsedLinks.map((part, i) =>
                part.type === 'link' ? (
                  <a
                    key={i}
                    href={part.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sky-600 dark:text-sky-400
                      hover:text-sky-700 dark:hover:text-sky-300
                      underline underline-offset-2
                      transition-colors"
                  >
                    {part.content}
                  </a>
                ) : (
                  <span key={i}>{part.content}</span>
                )
              )
            : cleanedDescription
            }
          </p>
        )}
      </div>

      {/* Footer - Status and Due Date */}
      <div className="flex items-center justify-between
        mt-3 pt-3
        border-t border-gray-100 dark:border-gray-700/50
        gap-3"
      >
        {/* Status indicator - Left side */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusDot status={task.status} overdue={overdue} />
          <span className={`text-xs font-medium truncate ${statusStyle.textColor}`}>
            {task.status === 'completed' ? 'Completed' : overdue ? 'Overdue' : 'In Progress'}
          </span>
        </div>

        {/* Due date display - Right side */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Calendar className={`w-3.5 h-3.5 ${statusStyle.textColor}`} />
          <span className={`text-xs font-medium whitespace-nowrap ${statusStyle.textColor}`}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Touch feedback overlay */}
      <div className="md:hidden absolute inset-0 rounded-2xl pointer-events-none
        bg-gray-900/0 active:bg-gray-900/5 dark:active:bg-gray-900/20
        transition-colors duration-150"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.index === nextProps.index
  );
});