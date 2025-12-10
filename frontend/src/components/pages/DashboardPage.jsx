import { useState, useEffect } from 'react';
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
  MessageSquare,
  Calendar,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { Navigation } from '../layout';
import { Button, Card } from '../common';
import { getChatSessions } from '../../services/api';

export const DashboardPage = ({ onQuestionSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    successRate: 100,
    activeUsers: 1,
    recentActivity: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const sessionsData = await getChatSessions();
      setSessions(sessionsData);
      
      // Calculate stats based on sessions
      setStats({
        totalSessions: sessionsData.length,
        successRate: 100, // Placeholder
        activeUsers: 1,
        recentActivity: sessionsData.filter(s => {
           const date = new Date(s.created_at);
           const now = new Date();
           // Check if within last 24 hours
           return (now - date) < 24 * 60 * 60 * 1000;
        }).length,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (session.title && session.title.toLowerCase().includes(searchLower))
    );
  });

  const statCards = [
    { icon: MessageSquare, title: 'Total Sessions', value: stats.totalSessions.toString(), change: 0 },
    { icon: TrendingUp, title: 'Success Rate', value: `${stats.successRate}%`, change: 0 },
    { icon: Users, title: 'Active Users', value: stats.activeUsers.toString(), change: 0 },
    { icon: Activity, title: 'Recent Activity', value: stats.recentActivity.toString(), change: 0 },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
          {statCards.map((stat, index) => (
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
                  {stat.change > 0 ? '+' : ''}
                  {stat.change !== 0 ? `${stat.change}%` : '-'}
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
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-white">Search History</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search past analyses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
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
                Recent Sessions ({filteredSessions.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onQuestionSelect(session)} 
                      className="group cursor-pointer"
                    >
                      <Card className="p-5 h-full hover:border-blue-500/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(session.created_at)}
                          </div>
                        </div>
                        
                        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {session.title || 'Untitled Session'}
                        </h3>
                        
                        <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                           {/* Session summary or ID if description not available */}
                           Session ID: {session.id.substring(0, 8)}...
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-900">
                          <span className="text-xs text-gray-500">
                            View Analysis
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {!loading && filteredSessions.length === 0 && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-950/50 rounded-full">
                    <Search className="w-16 h-16 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No analyses found
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {searchTerm ? 'Try adjusting your search terms' : 'Start a new analysis to see it here'}
                    </p>
                  </div>
                  {!searchTerm && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onQuestionSelect('')}
                    >
                      Start Analysis
                    </Button>
                  )}
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
