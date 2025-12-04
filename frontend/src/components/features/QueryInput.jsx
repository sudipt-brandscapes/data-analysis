import { useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';
import { Card, Button } from '../common';

export const QueryInput = ({ onAnalyze, loading, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = () => {
    if (query.trim()) {
      onAnalyze(query);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Ask a Question</h2>
      <div className="flex space-x-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="What is the minimum price?"
          className="flex-1 px-4 py-3 bg-gray-950 border border-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <Button
          onClick={handleSubmit}
          disabled={!query.trim() || loading}
          icon={loading ? RefreshCw : BarChart3}
          variant="primary"
        >
          {loading ? 'Analyzing' : 'Analyze'}
        </Button>
      </div>
    </Card>
  );
};

QueryInput.propTypes = {
  onAnalyze: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  initialQuery: PropTypes.string,
};
