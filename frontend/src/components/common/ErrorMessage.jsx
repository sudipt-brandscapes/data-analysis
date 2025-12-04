import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

export const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-4 bg-red-500/10 rounded-lg border border-red-500/30 flex items-start space-x-3"
      >
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-400 text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            ×
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
};
