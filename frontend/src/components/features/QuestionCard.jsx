import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';

export const QuestionCard = ({ question, onSelect, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(question.question)}
      className="bg-gray-950 p-6 rounded-xl border border-gray-900 hover:border-blue-600 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{question.icon}</div>
        <motion.div animate={{ x: isHovered ? 5 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="text-gray-500 group-hover:text-blue-500" size={20} />
        </motion.div>
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-500 text-xs font-medium rounded-full border border-blue-600/30">
          {question.category}
        </span>
        <h3 className="text-white font-semibold text-base leading-tight">
          {question.question}
        </h3>
        <p className="text-gray-400 text-sm">{question.description}</p>
      </div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: isHovered ? '100%' : 0 }}
        transition={{ duration: 0.3 }}
        className="h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 mt-4 rounded-full"
      />
    </motion.div>
  );
};

QuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.number,
    icon: PropTypes.string,
    category: PropTypes.string,
    question: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};
