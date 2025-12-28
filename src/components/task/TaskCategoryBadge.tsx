import { CheckCircle, Clock, ListTodo } from 'lucide-react';

interface TaskCategoryBadgeProps {
  category: string;
  icon: string;
  isActive: boolean;
  count: number;
}

export function TaskCategoryBadge({ category, icon, isActive, count }: TaskCategoryBadgeProps) {
  const getIcon = () => {
    switch (icon) {
      case 'check':
        return <CheckCircle className="w-5 h-5" />;
      case 'clock':
        return <Clock className="w-5 h-5" />;
      default:
        return <ListTodo className="w-5 h-5" />;
    }
  };

  return (
    <div 
      className={`
        flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
        border border-transparent
        ${isActive 
          ? 'bg-primary-600 text-white shadow-md scale-[1.02] border-primary-500' 
          : 'bg-white hover:bg-gray-50 text-gray-700 hover:text-primary-600 shadow-sm hover:shadow hover:border-gray-200'
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        {getIcon()}
        <span className="font-semibold text-sm">{category}</span>
      </div>
      <span className={`
        px-2.5 py-0.5 text-xs font-semibold rounded-md
        ${isActive 
          ? 'bg-white/20 text-white' 
          : 'bg-primary-50 text-primary-700'
        }
      `}>
        {count}
      </span>
    </div>
  );
}