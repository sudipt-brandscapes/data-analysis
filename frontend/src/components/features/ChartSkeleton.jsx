import React from 'react';
import { motion } from 'framer-motion';

export const ChartSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-gray-950 rounded-xl border border-gray-900 p-6"
        >
          {/* Header Skeleton */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-800 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>

          {/* Chart Area Skeleton */}
          <div className="h-64 bg-gray-900/50 rounded-lg flex items-end justify-around p-4 space-x-2">
            {[40, 70, 55, 85, 60, 75, 50].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="flex-1 bg-gradient-to-t from-purple-600/30 to-purple-600/10 rounded-t"
              />
            ))}
          </div>

          {/* Footer Skeleton */}
          <div className="mt-4 pt-4 border-t border-gray-900 flex justify-between">
            <div className="h-3 bg-gray-800 rounded animate-pulse w-20" />
            <div className="h-3 bg-gray-800 rounded animate-pulse w-16" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
