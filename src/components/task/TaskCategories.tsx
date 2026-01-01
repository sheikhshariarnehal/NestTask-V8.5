import { memo, useMemo, useCallback } from 'react';
import {
  BookOpen,
  PenSquare,
  Presentation,
  Beaker,
  Microscope,
  ListTodo,
  FileText,
  Users,
  Building,
  Activity,
  Folder,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react';
import type { TaskCategory } from '../../types';

interface TaskCategoriesProps {
  onCategorySelect: (category: TaskCategory | null) => void;
  selectedCategory: TaskCategory | null;
  categoryCounts: Record<TaskCategory, number>;
}

interface CategoryItem {
  id: TaskCategory | null;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  activeBg: string;
}

// Static category configuration with colors for better visual distinction
const CATEGORIES: CategoryItem[] = [
  { id: null, label: 'All Tasks', icon: ListTodo, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', activeBg: 'bg-blue-600' },
  { id: 'task', label: 'Task', icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', activeBg: 'bg-indigo-600' },
  { id: 'presentation', label: 'Presentation', icon: Presentation, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20', activeBg: 'bg-purple-600' },
  { id: 'project', label: 'Project', icon: Folder, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', activeBg: 'bg-amber-600' },
  { id: 'assignment', label: 'Assignment', icon: PenSquare, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', activeBg: 'bg-emerald-600' },
  { id: 'quiz', label: 'Quiz', icon: BookOpen, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/20', activeBg: 'bg-rose-600' },
  { id: 'lab-report', label: 'Lab Report', icon: Beaker, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', activeBg: 'bg-cyan-600' },
  { id: 'lab-final', label: 'Lab Final', icon: Microscope, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/20', activeBg: 'bg-teal-600' },
  { id: 'lab-performance', label: 'Lab Perf.', icon: Activity, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', activeBg: 'bg-orange-600' },
  { id: 'documents', label: 'Documents', icon: FileText, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', activeBg: 'bg-sky-600' },
  { id: 'blc', label: 'BLC', icon: Building, color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/20', activeBg: 'bg-slate-600' },
  { id: 'groups', label: 'Groups', icon: Users, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/20', activeBg: 'bg-pink-600' },
  { id: 'others', label: 'Others', icon: MoreHorizontal, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', activeBg: 'bg-gray-600' },
];

// Mobile category pill - simple and clean
const MobileCategoryPill = memo(({ 
  item, 
  count,
  isSelected, 
  onClick 
}: { 
  item: CategoryItem; 
  count: number;
  isSelected: boolean; 
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
        isSelected
          ? `${item.activeBg} text-white shadow-sm`
          : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 ${count === 0 ? 'opacity-50' : ''}`
      }`}
    >
      {item.id === null ? 'All Tasks' : item.label}
    </button>
  );
});

// Desktop category card - optimized grid layout
const CategoryCard = memo(({ 
  item, 
  count, 
  isSelected, 
  onClick 
}: { 
  item: CategoryItem; 
  count: number; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border ${
        isSelected
          ? `${item.activeBg} text-white border-transparent shadow-md`
          : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm ${count === 0 ? 'opacity-60' : ''}`
      }`}
    >
      <div className={`p-2 rounded-lg transition-colors ${
        isSelected 
          ? 'bg-white/20' 
          : `${item.bgColor} group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30`
      }`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-white' : item.color}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-sm font-semibold truncate">{item.label}</div>
        <div className={`text-xs font-medium ${
          isSelected === item.id 
            ? 'opacity-90' 
            : count === 0 
              ? 'opacity-60 group-hover:opacity-80' 
              : 'opacity-70'
        }`}>
          {count} {count === 1 ? 'task' : 'tasks'}
        </div>
      </div>
    </button>
  );
});

export const TaskCategories = memo(function TaskCategories({ 
  onCategorySelect, 
  selectedCategory, 
  categoryCounts 
}: TaskCategoriesProps) {
  // Calculate total tasks - memoized
  const totalTasks = useMemo(() => 
    Object.values(categoryCounts).reduce((sum, count) => sum + count, 0), 
    [categoryCounts]
  );

  // Pre-compute all category data in one pass
  const categoryData = useMemo(() => 
    CATEGORIES.map(item => ({
      item,
      count: item.id === null ? totalTasks : (categoryCounts[item.id] || 0)
    })),
    [categoryCounts, totalTasks]
  );

  // Memoize click handler factory
  const handleClick = useCallback((id: TaskCategory | null) => () => {
    onCategorySelect(id);
  }, [onCategorySelect]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        Categories
      </h2>

      {/* Mobile: Horizontal scroll with pills */}
      <div className="sm:hidden -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {categoryData.map(({ item, count }) => (
            <MobileCategoryPill
              key={item.id || 'all'}
              item={item}
              count={count}
              isSelected={selectedCategory === item.id}
              onClick={handleClick(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Compact grid layout */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {categoryData.map(({ item, count }) => (
          <CategoryCard
            key={item.id || 'all'}
            item={item}
            count={count}
            isSelected={selectedCategory === item.id}
            onClick={handleClick(item.id)}
          />
        ))}
      </div>
    </div>
  );
});