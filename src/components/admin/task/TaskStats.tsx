import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { 
  BarChart2, PieChart, Clock, CheckCircle, ListTodo, Calendar, 
  TrendingUp, Archive, AlertCircle, Download, Share2, Zap,
  BarChart, PieChartIcon, LineChart, ArrowUpRight,
  FileText, CheckSquare, XCircle, Filter
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title, 
  PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { CSVLink } from 'react-csv';
import type { Task } from '../../../types';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

// Helper function to check if a task is overdue
function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

// Define chart options outside component to prevent recreation
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 10,
        usePointStyle: true,
        boxWidth: 8,
      },
    },
    tooltip: {
      padding: 10,
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      titleColor: 'rgba(255, 255, 255, 0.9)',
      bodyColor: 'rgba(255, 255, 255, 0.9)',
      displayColors: true,
      boxPadding: 4
    }
  },
};

// Define color maps outside component to prevent recreation
const categoryColorMap = [
  'rgba(59, 130, 246, 0.7)',   // blue
  'rgba(16, 185, 129, 0.7)',   // green
  'rgba(245, 158, 11, 0.7)',   // yellow
  'rgba(239, 68, 68, 0.7)',    // red
  'rgba(168, 85, 247, 0.7)',   // purple
  'rgba(79, 70, 229, 0.7)',    // indigo
  'rgba(236, 72, 153, 0.7)',   // pink
  'rgba(249, 115, 22, 0.7)',   // orange
  'rgba(20, 184, 166, 0.7)',   // teal
  'rgba(6, 182, 212, 0.7)',    // cyan
  'rgba(16, 185, 129, 0.7)',   // emerald
  'rgba(132, 204, 22, 0.7)',   // lime
];

const categoryNameMap: Record<string, string> = {
  'assignment': 'Assignment',
  'blc': 'BLC',
  'documents': 'Documents',
  'final-exam': 'Final Exam',
  'groups': 'Groups',
  'lab-final': 'Lab Final',
  'lab-performance': 'Lab Performance',
  'lab-report': 'Lab Report',
  'midterm': 'Midterm',
  'presentation': 'Presentation',
  'project': 'Project',
  'quiz': 'Quiz',
  'task': 'Task',
  'others': 'Others'
};

interface TaskStatsProps {
  tasks: Task[];
}

export const TaskStats = memo(({ tasks }: TaskStatsProps) => {
  const [activeChart, setActiveChart] = useState<'status' | 'category' | 'timeline' | 'trend'>('category');
  const [animateChart, setAnimateChart] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Memoize filtered tasks to prevent recomputation
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (timeFilter === 'all') return true;
      
      const taskDate = new Date(task.createdAt);
      const now = new Date();
      const diffTime = now.getTime() - taskDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (timeFilter === '30days' && diffDays <= 30) return true;
      if (timeFilter === '7days' && diffDays <= 7) return true;
      
      return false;
    });
  }, [tasks, timeFilter]);

  // Memoize status statistics
  const statusStats = useMemo(() => ({
    todo: filteredTasks.filter(task => task.status === 'my-tasks' && !isOverdue(task.dueDate)).length,
    inProgress: filteredTasks.filter(task => task.status === 'in-progress' && !isOverdue(task.dueDate)).length,
    completed: filteredTasks.filter(task => task.status === 'completed').length,
    overdue: filteredTasks.filter(task => isOverdue(task.dueDate) && task.status !== 'completed').length
  }), [filteredTasks]);
  
  // Memoize category statistics
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredTasks.forEach(task => {
      if (!stats[task.category]) {
        stats[task.category] = 0;
      }
      stats[task.category]++;
    });
    return stats;
  }, [filteredTasks]);

  // Memoize timeline statistics
  const timelineStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      today: filteredTasks.filter(task => {
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate.toDateString() === today.toDateString();
        } catch (e) {
          console.error("Invalid date format:", task.dueDate);
          return false;
        }
      }).length,
      tomorrow: filteredTasks.filter(task => {
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate.toDateString() === tomorrow.toDateString();
        } catch (e) {
          return false;
        }
      }).length,
      thisWeek: filteredTasks.filter(task => {
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate > today && dueDate < nextWeek;
        } catch (e) {
          return false;
        }
      }).length,
      later: filteredTasks.filter(task => {
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate >= nextWeek;
        } catch (e) {
          return false;
        }
      }).length,
      overdue: filteredTasks.filter(task => {
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate < today && task.status !== 'completed';
        } catch (e) {
          return false;
        }
      }).length,
    };
  }, [filteredTasks]);

  // Calculate completion rate
  const completionRate = useMemo(() => 
    filteredTasks.length > 0 
      ? Math.round((statusStats.completed / filteredTasks.length) * 100) 
      : 0,
    [filteredTasks.length, statusStats.completed]
  );
  
  // Memoize Helper functions
  const getCategoryName = useCallback((key: string): string => {
    return categoryNameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
  }, []);

  const getPercentage = useCallback((value: number) => {
    if (filteredTasks.length === 0) return 0;
    return Math.round((value / filteredTasks.length) * 100);
  }, [filteredTasks.length]);

  const getStatusColor = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      'todo': 'bg-blue-500',
      'inProgress': 'bg-yellow-500',
      'completed': 'bg-green-500',
      'overdue': 'bg-red-500'
    };
    return colorMap[status] || 'bg-gray-500';
  }, []);

  const getTimelineColor = useCallback((timeline: string) => {
    const colorMap: Record<string, string> = {
      'today': 'bg-red-500',
      'tomorrow': 'bg-orange-500',
      'thisWeek': 'bg-yellow-500',
      'later': 'bg-blue-500',
      'overdue': 'bg-purple-500',
    };
    return colorMap[timeline] || 'bg-gray-500';
  }, []);

  const getCategoryColor = useCallback((index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-lime-500',
    ];
    return colors[index % colors.length];
  }, []);
  
  // Memoize chart data to prevent recalculation
  const pieChartData = useMemo(() => ({
    labels: ['To Do', 'In Progress', 'Completed', 'Overdue'],
    datasets: [
      {
        data: [statusStats.todo, statusStats.inProgress, statusStats.completed, statusStats.overdue],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(245, 158, 11, 0.8)', // yellow
          'rgba(16, 185, 129, 0.8)', // green
          'rgba(239, 68, 68, 0.8)'   // red
        ],
        borderColor: [
          'rgba(37, 99, 235, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(5, 150, 105, 1)',
          'rgba(220, 38, 38, 1)'
        ],
        borderWidth: 1,
      },
    ],
  }), [statusStats]);
  
  const barChartData = useMemo(() => {
    const categories = Object.keys(categoryStats).map(cat => getCategoryName(cat));
    const counts = Object.values(categoryStats);
    
    return {
      labels: categories,
      datasets: [
        {
          label: 'Tasks by Category',
          data: counts,
          backgroundColor: categories.map((_, index) => categoryColorMap[index % categoryColorMap.length]),
          borderWidth: 1,
        },
      ],
    };
  }, [categoryStats, getCategoryName]);
  
  const timelineChartData = useMemo(() => ({
    labels: ['Today', 'Tomorrow', 'This Week', 'Later', 'Overdue'],
    datasets: [
      {
        label: 'Tasks by Timeline',
        data: [
          timelineStats.today,
          timelineStats.tomorrow,
          timelineStats.thisWeek,
          timelineStats.later,
          timelineStats.overdue
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',    // red
          'rgba(249, 115, 22, 0.7)',   // orange 
          'rgba(245, 158, 11, 0.7)',   // yellow
          'rgba(59, 130, 246, 0.7)',   // blue
          'rgba(168, 85, 247, 0.7)',   // purple
        ],
        borderWidth: 1,
      },
    ],
  }), [timelineStats]);

  // Memoize CSV data preparation
  const csvData = useMemo(() => {
    const statusData = [
      ['Status', 'Count', 'Percentage'],
      ['To Do', statusStats.todo, getPercentage(statusStats.todo) + '%'],
      ['In Progress', statusStats.inProgress, getPercentage(statusStats.inProgress) + '%'],
      ['Completed', statusStats.completed, getPercentage(statusStats.completed) + '%'],
      ['Overdue', statusStats.overdue, getPercentage(statusStats.overdue) + '%'],
      ['Total', filteredTasks.length, '100%']
    ];
    
    const categoryData = Object.entries(categoryStats).map(([category, count]) => 
      [getCategoryName(category), count, getPercentage(count) + '%']
    );
    categoryData.unshift(['Category', 'Count', 'Percentage']);
    
    const timelineData = [
      ['Timeline', 'Count', 'Percentage'],
      ['Today', timelineStats.today, getPercentage(timelineStats.today) + '%'],
      ['Tomorrow', timelineStats.tomorrow, getPercentage(timelineStats.tomorrow) + '%'],
      ['This Week', timelineStats.thisWeek, getPercentage(timelineStats.thisWeek) + '%'],
      ['Later', timelineStats.later, getPercentage(timelineStats.later) + '%'],
      ['Overdue', timelineStats.overdue, getPercentage(timelineStats.overdue) + '%'],
      ['Total', filteredTasks.length, '100%']
    ];
    
    return { statusData, categoryData, timelineData };
  }, [
    statusStats, 
    categoryStats, 
    timelineStats, 
    filteredTasks.length, 
    getPercentage, 
    getCategoryName
  ]);
  
  // Trigger animation when chart changes
  useEffect(() => {
    setAnimateChart(false);
    const timer = setTimeout(() => {
      setAnimateChart(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeChart, timeFilter]);
  
  // Print mode handling
  useEffect(() => {
    if (printMode) {
      const printContent = () => {
        window.print();
        setPrintMode(false);
      };
      
      // Delay printing to allow chart rendering
      const timer = setTimeout(printContent, 300);
      return () => clearTimeout(timer);
    }
  }, [printMode]);

  // Handle print report
  const handlePrint = useCallback(() => {
    setPrintMode(true);
  }, []);

  // CSV export handler
  const handleExport = useCallback(() => {
    setIsExporting(true);
    // Allow time for async operations
    setTimeout(() => setIsExporting(false), 500);
    return true;
  }, []);

  // Time filter handler
  const handleTimeFilterChange = useCallback((filter: 'all' | '30days' | '7days') => {
    setTimeFilter(filter);
    setAnimateChart(false);
    setTimeout(() => {
      setAnimateChart(true);
    }, 100);
  }, []);

  // Chart type handler
  const handleChartTypeChange = useCallback((chartType: 'status' | 'category' | 'timeline' | 'trend') => {
    setActiveChart(chartType);
  }, []);

  // Memoized chart components to prevent unnecessary re-renders
  const StatusChart = useMemo(() => (
    <div className="space-y-3 xs:space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs xs:text-sm font-medium text-gray-700 dark:text-gray-300">Status Distribution</h4>
        <div className="bg-blue-50 dark:bg-blue-900/20 py-0.5 xs:py-1 px-1.5 xs:px-2 rounded-md">
          <span className="text-[10px] xs:text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center">
            <TrendingUp className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
            {completionRate}% Complete
          </span>
        </div>
      </div>
      
      <div className="hidden sm:block">
        <div className="h-[280px] w-full">
          <Pie data={pieChartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="sm:hidden flex items-center justify-center h-40 sm:h-44 md:h-48 relative">
        {/* Optimized SVG for mobile */}
        <div className="relative w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 md:w-36 md:h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-md" aria-hidden="true">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="15"
              className="dark:stroke-gray-700"
            />
            
            {filteredTasks.length > 0 && (
              <>
                {/* To Do segment */}
                {statusStats.todo > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="url(#status-blueGradient)"
                    strokeWidth="15"
                    strokeDasharray={`${statusStats.todo / filteredTasks.length * 238.8} 238.8`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                  />
                )}
                
                {/* In Progress segment */}
                {statusStats.inProgress > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="url(#status-yellowGradient)"
                    strokeWidth="15"
                    strokeDasharray={`${statusStats.inProgress / filteredTasks.length * 238.8} 238.8`}
                    strokeDashoffset={`${-statusStats.todo / filteredTasks.length * 238.8}`}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                  />
                )}
                
                {/* Completed segment */}
                {statusStats.completed > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="url(#status-greenGradient)"
                    strokeWidth="15"
                    strokeDasharray={`${statusStats.completed / filteredTasks.length * 238.8} 238.8`}
                    strokeDashoffset={`${-(statusStats.todo + statusStats.inProgress) / filteredTasks.length * 238.8}`}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                  />
                )}
                
                {/* Overdue segment */}
                {statusStats.overdue > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="url(#status-redGradient)"
                    strokeWidth="15"
                    strokeDasharray={`${statusStats.overdue / filteredTasks.length * 238.8} 238.8`}
                    strokeDashoffset={`${-(statusStats.todo + statusStats.inProgress + statusStats.completed) / filteredTasks.length * 238.8}`}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
                  />
                )}
              </>
            )}
            
            {/* Define gradients */}
            <defs>
              <linearGradient id="status-blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="status-yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="status-greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="status-redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white dark:bg-gray-800 rounded-full w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex flex-col items-center justify-center shadow-inner">
              <span className="block text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{filteredTasks.length}</span>
              <span className="text-[8px] xs:text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status legend and details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xs:gap-3 mt-2">
        <div className="flex flex-col items-center p-1.5 xs:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="bg-blue-500 w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full mb-0.5 xs:mb-1"></div>
          <span className="text-[10px] xs:text-xs font-medium text-gray-700 dark:text-gray-300 text-center">To Do</span>
          <span className="text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{statusStats.todo}</span>
          <span className="text-[8px] xs:text-[10px] text-blue-600 dark:text-blue-400">{getPercentage(statusStats.todo)}%</span>
        </div>
        
        <div className="flex flex-col items-center p-1.5 xs:p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="bg-yellow-500 w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full mb-0.5 xs:mb-1"></div>
          <span className="text-[10px] xs:text-xs font-medium text-gray-700 dark:text-gray-300 text-center">In Progress</span>
          <span className="text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{statusStats.inProgress}</span>
          <span className="text-[8px] xs:text-[10px] text-yellow-600 dark:text-yellow-400">{getPercentage(statusStats.inProgress)}%</span>
        </div>
        
        <div className="flex flex-col items-center p-1.5 xs:p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="bg-red-500 w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full mb-0.5 xs:mb-1"></div>
          <span className="text-[10px] xs:text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Due Tasks</span>
          <span className="text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{statusStats.overdue}</span>
          <span className="text-[8px] xs:text-[10px] text-red-600 dark:text-red-400">{getPercentage(statusStats.overdue)}%</span>
        </div>
        
        <div className="flex flex-col items-center p-1.5 xs:p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="bg-green-500 w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full mb-0.5 xs:mb-1"></div>
          <span className="text-[10px] xs:text-xs font-medium text-gray-700 dark:text-gray-300 text-center">Completed</span>
          <span className="text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{statusStats.completed}</span>
          <span className="text-[8px] xs:text-[10px] text-green-600 dark:text-green-400">{getPercentage(statusStats.completed)}%</span>
        </div>
      </div>

      {/* Completion meter */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{completionRate}% Complete</span>
        </div>
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-green-500 rounded-full"
            style={{ width: `${completionRate}%`, transition: 'width 1s ease-out' }}
          ></div>
        </div>
      </div>
    </div>
  ), [pieChartData, completionRate, statusStats, filteredTasks.length, getPercentage]);

  const CategoryChart = useMemo(() => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Distribution</h4>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {Object.keys(categoryStats).length} categories
        </div>
      </div>
      
      <div className="h-[350px] w-full">
        <Bar data={barChartData} options={{
          ...chartOptions,
          indexAxis: 'y' as const,
          plugins: {
            ...chartOptions.plugins,
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              grid: {
                display: false
              }
            },
            x: {
              grid: {
                color: 'rgba(156, 163, 175, 0.1)'
              }
            }
          }
        }} />
      </div>
      
      <div className="max-h-[180px] overflow-y-auto pr-1 custom-scrollbar mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count], index) => (
              <div key={category} className="bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)} mr-2`}></div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[130px]">
                      {getCategoryName(category)}
                    </span>
                  </div>
                  <div className="flex items-center bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded-md shadow-sm">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-1">{count}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">({getPercentage(count)}%)</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  ), [barChartData, categoryStats, getCategoryName, getCategoryColor, getPercentage]);

  const TimelineChart = useMemo(() => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date Distribution</h4>
        {timelineStats.overdue > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 py-1 px-2 rounded-md">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              {timelineStats.overdue} Overdue
            </span>
          </div>
        )}
      </div>
      
      <div className="h-[280px] w-full">
        <Bar 
          data={timelineChartData} 
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              legend: {
                display: false
              }
            }
          }} 
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-2">
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-red-500 dark:text-red-400 mr-1.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Today</span>
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-white">{timelineStats.today}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-orange-500 dark:text-orange-400 mr-1.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tomorrow</span>
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-white">{timelineStats.tomorrow}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mr-1.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">This Week</span>
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-white">{timelineStats.thisWeek}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-1.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Later</span>
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-white">{timelineStats.later}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400 mr-1.5" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Overdue</span>
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-white">{timelineStats.overdue}</span>
          </div>
        </div>
      </div>
    </div>
  ), [timelineChartData, timelineStats]);

  // Memoize chart data
  const getCategoryChartData = useCallback(() => {
    const labels = Object.keys(categoryStats).map(getCategoryName);
    const data = Object.values(categoryStats);

    return {
      labels,
      datasets: [
        {
          label: 'Tasks by Category',
          data,
          backgroundColor: Object.keys(categoryStats).map((_, i) => categoryColorMap[i % categoryColorMap.length]),
          borderWidth: 1,
        },
      ],
    };
  }, [categoryStats, getCategoryName]);

  const getStatusChartData = useCallback(() => {
    const statuses = ['To Do', 'In Progress', 'Completed', 'Overdue'];
    const statusValues = [statusStats.todo, statusStats.inProgress, statusStats.completed, statusStats.overdue];
    
    return {
      labels: statuses,
      datasets: [
        {
          label: 'Tasks by Status',
          data: statusValues,
          backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)'],
          borderWidth: 1,
        },
      ],
    };
  }, [statusStats]);

  const getTimelineChartData = useCallback(() => {
    const timelineLabels = ['Today', 'Tomorrow', 'This Week', 'Later', 'Overdue'];
    const timelineValues = [
      timelineStats.today,
      timelineStats.tomorrow,
      timelineStats.thisWeek,
      timelineStats.later,
      timelineStats.overdue,
    ];

    return {
      labels: timelineLabels,
      datasets: [
        {
          label: 'Task Timeline',
          data: timelineValues,
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',    // red - today
            'rgba(245, 158, 11, 0.7)',   // yellow - tomorrow
            'rgba(249, 115, 22, 0.7)',   // orange - this week
            'rgba(59, 130, 246, 0.7)',   // blue - later
            'rgba(168, 85, 247, 0.7)',   // purple - overdue
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [timelineStats]);

  // Function to get data for export
  const getExportData = useCallback(() => {
    const data = [];
    
    // Add status data
    data.push(['Status', 'Count', 'Percentage']);
    data.push(['To Do', statusStats.todo, `${getPercentage(statusStats.todo)}%`]);
    data.push(['In Progress', statusStats.inProgress, `${getPercentage(statusStats.inProgress)}%`]);
    data.push(['Completed', statusStats.completed, `${getPercentage(statusStats.completed)}%`]);
    data.push(['Overdue', statusStats.overdue, `${getPercentage(statusStats.overdue)}%`]);
    
    // Add categories
    data.push([]);
    data.push(['Category', 'Count', 'Percentage']);
    Object.entries(categoryStats).forEach(([category, count]) => {
      data.push([getCategoryName(category), count, `${getPercentage(count)}%`]);
    });
    
    // Add timeline
    data.push([]);
    data.push(['Timeline', 'Count', 'Percentage']);
    data.push(['Today', timelineStats.today, `${getPercentage(timelineStats.today)}%`]);
    data.push(['Tomorrow', timelineStats.tomorrow, `${getPercentage(timelineStats.tomorrow)}%`]);
    data.push(['This Week', timelineStats.thisWeek, `${getPercentage(timelineStats.thisWeek)}%`]);
    data.push(['Later', timelineStats.later, `${getPercentage(timelineStats.later)}%`]);
    data.push(['Overdue', timelineStats.overdue, `${getPercentage(timelineStats.overdue)}%`]);
    
    return data;
  }, [statusStats, categoryStats, timelineStats, getPercentage, getCategoryName]);

  // Rendering the component with performance optimizations
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden" ref={chartRef}>
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Task Analytics</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {filteredTasks.length} tasks {timeFilter !== 'all' ? (timeFilter === '7days' ? '(last 7 days)' : '(last 30 days)') : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => handleTimeFilterChange('all')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                  timeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => handleTimeFilterChange('30days')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                  timeFilter === '30days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => handleTimeFilterChange('7days')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm ${
                  timeFilter === '7days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                7 Days
              </button>
            </div>
            
            <div className="inline-flex text-xs sm:text-sm">
              <CSVLink
                data={getExportData()}
                filename={`task-stats-${new Date().toISOString().slice(0, 10)}.csv`}
                className="px-2 sm:px-3 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </CSVLink>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">To Do</p>
                <h4 className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{statusStats.todo}</h4>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
                <ListTodo className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-blue-200 dark:bg-blue-800/20 rounded-full h-1.5">
                <div className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full" style={{ width: `${getPercentage(statusStats.todo)}%` }}></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getPercentage(statusStats.todo)}% of total</p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
                <h4 className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">{statusStats.inProgress}</h4>
              </div>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-800/30 rounded-full">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-yellow-200 dark:bg-yellow-800/20 rounded-full h-1.5">
                <div className="bg-yellow-600 dark:bg-yellow-500 h-1.5 rounded-full" style={{ width: `${getPercentage(statusStats.inProgress)}%` }}></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getPercentage(statusStats.inProgress)}% of total</p>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                <h4 className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{statusStats.completed}</h4>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-full">
                <CheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-green-200 dark:bg-green-800/20 rounded-full h-1.5">
                <div className="bg-green-600 dark:bg-green-500 h-1.5 rounded-full" style={{ width: `${getPercentage(statusStats.completed)}%` }}></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getPercentage(statusStats.completed)}% of total</p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Overdue</p>
                <h4 className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{statusStats.overdue}</h4>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-800/30 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-red-200 dark:bg-red-800/20 rounded-full h-1.5">
                <div className="bg-red-600 dark:bg-red-500 h-1.5 rounded-full" style={{ width: `${getPercentage(statusStats.overdue)}%` }}></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getPercentage(statusStats.overdue)}% of total</p>
            </div>
          </div>
        </div>

        {/* Chart Type Selection */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className={`px-2.5 py-1.5 text-xs sm:text-sm rounded-lg flex items-center gap-1.5 ${
                activeChart === 'category'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveChart('category')}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>By Category</span>
            </button>
            <button
              className={`px-2.5 py-1.5 text-xs sm:text-sm rounded-lg flex items-center gap-1.5 ${
                activeChart === 'status'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveChart('status')}
            >
              <BarChart className="w-3.5 h-3.5" />
              <span>By Status</span>
            </button>
            <button
              className={`px-2.5 py-1.5 text-xs sm:text-sm rounded-lg flex items-center gap-1.5 ${
                activeChart === 'timeline'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveChart('timeline')}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          <div className="h-60 sm:h-72">
            {activeChart === 'category' && (
              <>
                {Object.keys(categoryStats).length > 0 ? (
                  <div className="h-full">
                    <Pie data={getCategoryChartData()} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No category data available</p>
                  </div>
                )}
              </>
            )}
            
            {activeChart === 'status' && (
              <>
                {filteredTasks.length > 0 ? (
                  <div className="h-full">
                    <Bar data={getStatusChartData()} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No status data available</p>
                  </div>
                )}
              </>
            )}
            
            {activeChart === 'timeline' && (
              <>
                {filteredTasks.length > 0 ? (
                  <div className="h-full">
                    <Bar data={getTimelineChartData()} options={chartOptions} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No timeline data available</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Add display name for better debugging
TaskStats.displayName = 'TaskStats'; 