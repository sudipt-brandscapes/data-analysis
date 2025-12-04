import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export const Card = ({ 
  children, 
  className = '', 
  hover = false,
  gradient = false,
  ...props 
}) => {
  const baseStyles = 'rounded-xl border transition-all duration-300';
  const defaultStyles = gradient 
    ? 'bg-gradient-to-br from-gray-900 to-black border-gray-900'
    : 'bg-gray-950 border-gray-900';
  const hoverStyles = hover ? 'hover:border-blue-600 hover:shadow-lg' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseStyles} ${defaultStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hover: PropTypes.bool,
  gradient: PropTypes.bool,
};
