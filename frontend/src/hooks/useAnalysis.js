import { useState } from 'react';
import { executeAnalysis } from '../services/api';

export const useAnalysis = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (query) => {
    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await executeAnalysis(query);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setResults(null);
    setError('');
  };

  return {
    results,
    loading,
    error,
    handleAnalyze,
    resetAnalysis,
  };
};
