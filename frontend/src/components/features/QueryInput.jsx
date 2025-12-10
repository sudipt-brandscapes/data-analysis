import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const QueryInput = ({ onAnalyze, loading, initialQuery = '', mode = 'centered', onStop }) => {
  const [query, setQuery] = useState(initialQuery);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (loading && onStop) {
        onStop();
        return;
    }
    if (query.trim() && !loading) {
      onAnalyze(query);
      setQuery(''); // Clear query after submit
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCentered = mode === 'centered';

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-500 ${isCentered ? 'scale-100' : 'scale-100'}`}>
      {isCentered && (
         <motion.h2 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-3xl font-bold text-white text-center mb-8"
         >
           What would you like to analyze today?
         </motion.h2>
      )}

      <div className="relative group">
        <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transition-opacity duration-300 ${isCentered ? 'opacity-100' : 'opacity-0'}`} />
        
        <form 
          onSubmit={handleSubmit}
          className={`relative flex items-end gap-2 p-3 bg-gray-950/80 border border-gray-800 rounded-2xl shadow-2xl backdrop-blur-xl transition-colors`}
        >
          {/* File Upload Button (Commented out) */}

          <textarea
            ref={textareaRef}
            rows={1}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCentered ? "Ask anything about your data..." : "Ask a follow-up question..."}
            className="flex-1 max-h-[200px] py-1 bg-transparent text-white placeholder-gray-500 resize-none scrollbar-hide focus:outline-none focus:ring-0 border-none"
            disabled={loading}
          />

          {loading ? (
             <button
                type="button"
                onClick={onStop}
                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all duration-200"
                title="Stop Analysis"
             >
                <Square size={20} fill="currentColor" />
             </button>
          ) : (
            <button
                type="submit"
                disabled={!query.trim()}
                className={`p-2 rounded-lg transition-all duration-200 ${
                query.trim()
                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-500'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
            >
                <ArrowUp size={20} />
            </button>
          )}
        </form>
      </div>
      
      {isCentered && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {["Analyze sales trends", "Identify top performers", "Forecast next month"].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                // Optional: auto-submit or just fill
              }}
              className="px-4 py-2 text-sm text-gray-400 bg-gray-900/50 border border-gray-800 rounded-full hover:bg-gray-800 hover:text-white transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

QueryInput.propTypes = {
  onAnalyze: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  initialQuery: PropTypes.string,
  mode: PropTypes.oneOf(['centered', 'bottom']),
};
