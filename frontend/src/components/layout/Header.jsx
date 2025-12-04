import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import PropTypes from 'prop-types';
import { Button } from '../common';

export const Header = ({ onGetStarted }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/95 backdrop-blur-lg border-b border-gray-900'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div className="flex items-center space-x-3" whileHover={{ scale: 1.05 }}>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DataViz Pro</span>
          </motion.div>

          <nav className="hidden md:flex items-center space-x-8">
            {['Features', 'Analytics', 'AI-Powered', 'Contact'].map((item, index) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.1, color: '#3b82f6' }}
                className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
              >
                {item}
              </motion.a>
            ))}
          </nav>

          {onGetStarted && (
            <Button variant="primary" size="sm" onClick={onGetStarted}>
              Get Started
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

Header.propTypes = {
  onGetStarted: PropTypes.func,
};
