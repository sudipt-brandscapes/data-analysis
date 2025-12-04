import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export const ProgressBar = ({ progress, showPercentage = true, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-to-r from-purple-600 to-purple-500 rounded-full"
        />
      </div>
      {showPercentage && (
        <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
      )}
    </div>
  );
};

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  showPercentage: PropTypes.bool,
  className: PropTypes.string,
};
