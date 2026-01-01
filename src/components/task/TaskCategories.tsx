import { memo, useMemo } from 'react';
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
}

// Static category configuration
const CATEGORIES: CategoryItem[] = [
  { id: null, label: 'All Tasks', icon: ListTodo },
  { id: 'task', label: 'Task', icon: BookOpen },
  { id: 'presentation', label: 'Presentation', icon: Presentation },
  { id: 'project', label: 'Project', icon: Folder },
  { id: 'assignment', label: 'Assignment', icon: PenSquare },
  { id: 'quiz', label: 'Quiz', icon: BookOpen },
  { id: 'lab-report', label: 'Lab Report', icon: Beaker },
  { id: 'lab-final', label: 'Lab Final', icon: Microscope },
  { id: 'lab-performance', label: 'Lab Perf.', icon: Activity },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'blc', label: 'BLC', icon: Building },
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'others', label: 'Others', icon: MoreHorizontal },
];

// Mobile category button
const MobileCategoryButton = memo(({ 
  item, 
  isSelected, 
  onClick 
}: { 
  item: CategoryItem; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      isSelected
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`}
  >
    {item.id === null ? 'All' : item.label}
  </button>
));

// Desktop category card
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
      className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 border ${
        isSelected
          ? 'bg-blue-600 text-white border-blue-500'
          : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 ${count === 0 ? 'opacity-50' : ''}`
      }`}
    >
      <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-left min-w-0">
        <div className="text-sm font-semibold truncate">{item.label}</div>
        <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
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
  // Calculate total tasks
  const totalTasks = useMemo(() => 
    Object.values(categoryCounts).reduce((sum, count) => sum + count, 0), 
    [categoryCounts]
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        Categories
      </h2>

      {/* Mobile: Horizontal scroll */}
      <div className="sm:hidden">
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((item) => (
            <MobileCategoryButton
              key={item.id || 'all'}
              item={item}
              isSelected={selectedCategory === item.id}
              onClick={() => onCategorySelect(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {CATEGORIES.map((item) => (
          <CategoryCard
            key={item.id || 'all'}
            item={item}
            count={item.id === null ? totalTasks : (categoryCounts[item.id] || 0)}
            isSelected={selectedCategory === item.id}
            onClick={() => onCategorySelect(item.id)}
          />
        ))}
      </div>
    </div>
  );
});