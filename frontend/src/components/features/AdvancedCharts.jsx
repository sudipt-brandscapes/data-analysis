import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Scatter, Doughnut } from 'react-chartjs-2';
import { BarChart3, TrendingUp, PieChart, Activity, Maximize2 } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartIcons = {
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChart,
  scatter: Activity,
  area: Activity,
  doughnut: PieChart,
  histogram: BarChart3
};

const ChartCard = ({ chart, index }) => {
  const Icon = chartIcons[chart.type] || BarChart3;
  const chartRef = useRef(null);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 11
          },
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += typeof context.parsed.y === 'number' 
                ? context.parsed.y.toLocaleString()
                : context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: chart.type !== 'pie' && chart.type !== 'doughnut' ? {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10
          },
          callback: function(value) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          }
        }
      }
    } : undefined
  };

  const renderChart = () => {
    const chartData = chart.chartData;
    
    if (!chartData || (!chartData.labels && !chartData.datasets)) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      );
    }

    switch (chart.type) {
      case 'bar':
      case 'histogram':
        return <Bar ref={chartRef} data={chartData} options={chartOptions} />;
      case 'line':
        return <Line ref={chartRef} data={chartData} options={chartOptions} />;
      case 'area':
        return <Line ref={chartRef} data={chartData} options={{
          ...chartOptions,
          elements: {
            line: {
              fill: true
            }
          }
        }} />;
      case 'pie':
        return <Pie ref={chartRef} data={chartData} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut ref={chartRef} data={chartData} options={chartOptions} />;
      case 'scatter':
        return <Scatter ref={chartRef} data={chartData} options={chartOptions} />;
      default:
        return <Bar ref={chartRef} data={chartData} options={chartOptions} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-950 rounded-xl border border-gray-900 p-6 hover:border-blue-600/50 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Icon className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{chart.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{chart.description}</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </motion.button>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        {renderChart()}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-900">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Type: <span className="text-blue-500 font-medium">{chart.type}</span>
          </span>
          <span className="text-gray-500">
            Priority: <span className="text-purple-500 font-medium">{chart.priority}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};

ChartCard.propTypes = {
  chart: PropTypes.shape({
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    priority: PropTypes.number,
    chartData: PropTypes.object.isRequired
  }).isRequired,
  index: PropTypes.number.isRequired
};

export const AdvancedCharts = ({ charts }) => {
  if (!charts || charts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Data Visualizations</h2>
        <span className="text-sm text-gray-400">{charts.length} charts generated</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, index) => (
          <ChartCard key={index} chart={chart} index={index} />
        ))}
      </div>
    </div>
  );
};

AdvancedCharts.propTypes = {
  charts: PropTypes.arrayOf(PropTypes.object).isRequired
};
