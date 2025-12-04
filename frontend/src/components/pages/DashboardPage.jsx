import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Sparkles,
  Database,
  Search,
  Filter,
  ArrowRight,
  Activity,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { Navigation } from '../layout';
import { QuestionCard } from '../features';
import { Button, Card } from '../common';
import questionsData from '../../data/questions.json';

export const DashboardPage = ({ onQuestionSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', ...new Set(questionsData.map((q) => q.category))];

  const filteredQuestions = questionsData.filter((question) => {
    const matchesCategory =
      selectedCategory === 'All' || question.category === selectedCategory;
    const matchesSearch =
      question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = [
    { icon: BarChart3, title: 'Total Queries', value: '1,234', change: 12.5 },
    { icon: TrendingUp, title: 'Success Rate', value: '98.7%', change: 3.2 },
    { icon: Users, title: 'Active Users', value: '456', change: -2.1 },
    { icon: Package, title: 'Data Sources', value: '89', change: 15.8 },
  ];

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Left Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-64 h-screen bg-gray-950 border-r border-gray-900 flex flex-col flex-shrink-0"
      >
        <div className="p-6 border-b border-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">DataWise</h1>
          </div>
        </div>

        <div className="p-4 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Navigation
          </p>
          <Navigation />
        </div>

        <div className="px-4 pb-4 flex-shrink-0">
          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            onClick={() => onQuestionSelect('')}
            className="w-full"
          >
            Start Analysis
          </Button>
        </div>

        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quick Stats
          </p>
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-950/50 rounded-lg p-3 border border-gray-900/50"
            >
              <div className="flex items-center justify-between mb-1">
                <stat.icon className="w-4 h-4 text-blue-500" />
                <span
                  className={`text-xs font-medium ${
                    stat.change >= 0 ? 'text-blue-500' : 'text-red-400'
                  }`}
                >
                  {stat.change >= 0 ? '+' : ''}
                  {stat.change}%
                </span>
              </div>
              <p className="text-xs text-gray-400">{stat.title}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-900 flex-shrink-0">
          <div className="flex items-center space-x-2 text-gray-400 text-xs">
            <Activity className="w-4 h-4" />
            <span>System Active</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          <Card className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="text-blue-500" size={28} />
                  </motion.div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AI Analytics Dashboard
                  </h1>
                </div>
                <p className="text-gray-400 text-sm">
                  Transform your data into actionable insights with intelligent queries
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={ArrowRight}
                onClick={() => onQuestionSelect('')}
              >
                New Analysis
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-white">Explore Questions</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Sample Questions ({filteredQuestions.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredQuestions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onSelect={onQuestionSelect}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredQuestions.length === 0 && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-950/50 rounded-full">
                    <Search className="w-16 h-16 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No questions found
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

DashboardPage.propTypes = {
  onQuestionSelect: PropTypes.func.isRequired,
};
