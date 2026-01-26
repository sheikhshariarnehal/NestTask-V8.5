import { Chart as ChartJS, ArcElement, Tooltip, Legend, 
  CategoryScale, LinearScale, BarElement, Title, 
  PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register ChartJS components only when needed
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

// Optimized chart options to prevent forced reflows
export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // Disable animations to prevent forced reflows during render
  animation: false,
  // Use hardware acceleration where possible
  elements: {
    point: {
      radius: 0,
      hoverRadius: 5,
    },
  },
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 6,
      displayColors: false,
      padding: 12,
    },
  },
  // Disable interaction to reduce reflow calculations
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  // Fixed height to prevent layout shifts
  layout: {
    padding: {
      top: 10,
      bottom: 10,
    },
  },
};

export const barChartOptions = {
  ...chartOptions,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(107, 114, 128, 0.1)',
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 12,
        },
        beginAtZero: true,
      },
    },
  },
};

export { Pie, Bar, Line };