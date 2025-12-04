import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

export const InsightsPanel = ({ insights, summary, hideIfRedundant }) => {
  if (!insights && !summary) return null;

  const parseInsights = (insightsText) => {
    if (!insightsText) return [];
    
    // Split by numbered list or bullet points
    const lines = insightsText.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Remove numbering and clean up
      return line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
    }).filter(line => line.length > 0);
  };

  const insightsList = parseInsights(insights);
  
  // If no meaningful insights, don't show the panel
  if (hideIfRedundant && insightsList.length === 0 && !summary?.correlations) {
    return null;
  }

  const getInsightIcon = (index) => {
    const icons = [TrendingUp, Lightbulb, AlertCircle, CheckCircle, Sparkles];
    return icons[index % icons.length];
  };

  // Only show correlations if they exist
  const hasCorrelations = summary?.correlations && Object.keys(summary.correlations).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-950 rounded-xl border border-gray-900 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-lg">
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Key Insights</h2>
          <p className="text-sm text-gray-300">Important findings from your query</p>
        </div>
      </div>

      {/* Insights List - Only show if we have insights */}
      {insightsList.length > 0 && (
        <div className="space-y-3">
          {insightsList.map((insight, index) => {
            const Icon = getInsightIcon(index);
            const colors = [
              { bg: 'bg-amber-600/20', icon: 'text-amber-400', border: 'border-amber-600/30' },
              { bg: 'bg-emerald-600/20', icon: 'text-emerald-400', border: 'border-emerald-600/30' },
              { bg: 'bg-cyan-600/20', icon: 'text-cyan-400', border: 'border-cyan-600/30' },
              { bg: 'bg-rose-600/20', icon: 'text-rose-400', border: 'border-rose-600/30' },
              { bg: 'bg-violet-600/20', icon: 'text-violet-400', border: 'border-violet-600/30' },
            ];
            const colorSet = colors[index % colors.length];
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex items-start space-x-3 p-4 bg-gray-900/30 rounded-lg border ${colorSet.border} hover:border-opacity-70 transition-colors`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`p-2 ${colorSet.bg} rounded-lg`}>
                    <Icon className={`w-4 h-4 ${colorSet.icon}`} />
                  </div>
                </div>
                <p className="text-sm text-gray-100 leading-relaxed">{insight}</p>
              </motion.div>
            );
          })}
        </div>
      )}


    </motion.div>
  );
};

InsightsPanel.propTypes = {
  insights: PropTypes.string,
  summary: PropTypes.shape({
    row_count: PropTypes.number,
    column_count: PropTypes.number,
    numeric_columns: PropTypes.array,
    categorical_columns: PropTypes.array,
    correlations: PropTypes.object
  }),
  hideIfRedundant: PropTypes.bool
};
