import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

export const LoadingSpinner = ({ size = 'md', text }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="p-4 bg-purple-500/20 rounded-full"
      >
        <RefreshCw className={`${sizes[size]} text-purple-400`} />
      </motion.div>
      {text && (
        <div>
          <p className="text-gray-400 font-medium mb-2">{text}</p>
          <p className="text-gray-600 text-sm">Please wait...</p>
        </div>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  text: PropTypes.string,
};
