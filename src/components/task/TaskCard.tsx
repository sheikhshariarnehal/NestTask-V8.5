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

const categoryBgMap: Record<string, string> = {
  'quiz': 'bg-blue-50 dark:bg-blue-900/20',
  'assignment': 'bg-orange-50 dark:bg-orange-900/20',
  'presentation': 'bg-red-50 dark:bg-red-900/20',
  'project': 'bg-indigo-50 dark:bg-indigo-900/20',
  'lab-report': 'bg-green-50 dark:bg-green-900/20',
  'lab-final': 'bg-purple-50 dark:bg-purple-900/20',
  'lab-performance': 'bg-pink-50 dark:bg-pink-900/20',
  'documents': 'bg-yellow-50 dark:bg-yellow-900/20',
  'blc': 'bg-cyan-50 dark:bg-cyan-900/20',
  'groups': 'bg-teal-50 dark:bg-teal-900/20',
  'default': 'bg-gray-100 dark:bg-gray-800'
};

// Helper functions for efficient category handling
const getCategoryColor = (category: string) => {
  const key = category.toLowerCase();
  return categoryColorMap[key] || categoryColorMap.default;
};

const getCategoryBg = (category: string) => {
  const key = category.toLowerCase();
  return categoryBgMap[key] || categoryBgMap.default;
};

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
  const categoryBg = getCategoryBg(task.category);
  
  // Return simplified status text color
  const statusTextColor = overdue && task.status !== 'completed' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400';

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
        overdue ? 'task-card-overdue' : 'task-card-default'
      } motion-safe:animate-fade-in group hover:bg-gray-50/50 dark:hover:bg-gray-800/50`}
      style={{ 
        animationDelay,
        animationDuration: '500ms'
      }}
    >
      <div className="flex flex-col h-full gap-1.5">
        {/* Top: Content (Title & Description) */}
        <div className="space-y-0.5 flex-1 min-h-0">
          <div className="flex justify-between items-start gap-1">
            <h3 className="text-[13px] leading-tight font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 md:line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {task.name}
            </h3>
            
             {/* Show overdue indicator explicitly at top right */}
             {overdue && task.status !== 'completed' && (
                <span className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                  Overdue
                </span>
             )}
          </div>

          {/* Clean Description */}
          {cleanedDescription && (
            <div className="text-[11px] text-gray-500 dark:text-gray-500 leading-relaxed line-clamp-2 break-words">
               {parsedLinks.length > 0 ?
                parsedLinks.map((part, i) =>
                  part.type === 'link' ? (
                    <a
                      key={i}
                      href={part.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 hover:underline px-0.5"
                    >
                      link
                    </a>
                  ) : (
                    <span key={i}>{part.content}</span>
                  )
                )
              : cleanedDescription
              }
            </div>
          )}
        </div>

        {/* Bottom: Meta (Category & Date) */}
        <div className="flex items-center justify-between pt-1.5 mt-auto border-t border-gray-50 dark:border-gray-800/50">
           {/* Category Badge */}
           <span className={`inline-flex items-center gap-1 
             px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider
             ${categoryBg} ${categoryColor}
             transition-colors duration-200`}
           >
            <CategoryIcon category={task.category} className="w-2.5 h-2.5" />
            <span className="truncate max-w-[90px]">{formattedCategory}</span>
          </span>
          
           {/* Due Date */}
           <div className={`flex items-center gap-1 text-[9px] font-medium ${statusTextColor}`}>
             <Calendar className="w-2.5 h-2.5 opacity-70" />
             <span>{formattedDate}</span>
           </div>
        </div>
      </div>
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