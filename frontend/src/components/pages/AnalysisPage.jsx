import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  FileSpreadsheet,
  TrendingUp,
  Activity,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { Sidebar } from '../layout';
import { QueryInput, DataVisualization, ResultsTable, AdvancedCharts, InsightsPanel } from '../features';
import { Card, LoadingSpinner, ErrorMessage } from '../common';
import { uploadFile, executeAnalysis, generateVisualizations } from '../../services/api';

export const AnalysisPage = ({ selectedQuestion = '', onBackToDashboard }) => {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visualizations, setVisualizations] = useState(null);
  const [loadingViz, setLoadingViz] = useState(false);

  useEffect(() => {
    if (selectedQuestion) {
      setQuery(selectedQuestion);
    }
  }, [selectedQuestion]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError('');
    handleFileUpload(selectedFile);
  };

  const handleFileUpload = async (uploadFileParam) => {
    const fileToUpload = uploadFileParam || file;
    if (!fileToUpload) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      await uploadFile(fileToUpload, (progress) => {
        setUploadProgress(progress);
      });

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      setError('Failed to upload file. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAnalyze = async (queryText) => {
    if (!file || !queryText.trim()) {
      setError('Please upload a file and enter a question');
      return;
    }

    setLoading(true);
    setError('');
    setVisualizations(null);

    try {
      const data = await executeAnalysis(queryText);
      setResults(data);

      // Generate visualizations if we have results
      if (data.results && data.results.length > 0) {
        setLoadingViz(true);
        try {
          const vizData = await generateVisualizations(data.results, queryText);
          console.log('Visualization data received:', vizData);
          setVisualizations(vizData);
        } catch (vizError) {
          console.error('Visualization error:', vizError);
          // Don't show error for visualization failure, just skip it
        } finally {
          setLoadingViz(false);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analysisData = useMemo(() => {
    if (!results || !results.results || results.results.length === 0) {
      return null;
    }

    const data = results.results;
    const keys = Object.keys(data[0]);
    const values = Object.values(data[0]);

    const hasNumericData = values.some(
      (v) => typeof v === 'number' || !isNaN(parseFloat(v))
    );
    const isSingleValue = data.length === 1 && keys.length === 1;
    const isMultipleRows = data.length > 1;

    return {
      data,
      keys,
      values,
      hasNumericData,
      isSingleValue,
      isMultipleRows,
      rowCount: data.length,
      columnCount: keys.length,
    };
  }, [results]);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar
        file={file}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onFileSelect={handleFileSelect}
        onBackToDashboard={onBackToDashboard}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
          <QueryInput
            onAnalyze={handleAnalyze}
            loading={loading}
            initialQuery={query}
          />

          {error && <ErrorMessage message={error} onClose={() => setError('')} />}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Analysis</h2>

            <AnimatePresence mode="wait">
              {loading ? (
                <Card className="p-12 text-center">
                  <LoadingSpinner size="lg" text="Analyzing Your Data" />
                </Card>
              ) : results ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* 1. Query Explanation - FIRST */}
                  {results.explanation && (
                    <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-white mb-2">
                            Query Explanation
                          </h3>
                          <p className="text-sm text-gray-100 leading-relaxed">
                            {results.explanation}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* 2. Advanced Charts - MIDDLE (only if generated) */}
                  {loadingViz ? (
                    <Card className="p-8 text-center">
                      <LoadingSpinner size="md" text="Generating visualizations..." />
                    </Card>
                  ) : visualizations?.charts && visualizations.charts.length > 0 ? (
                    <AdvancedCharts charts={visualizations.charts} />
                  ) : null}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analysisData &&
                      analysisData.hasNumericData &&
                      analysisData.isMultipleRows && (
                        <Card className="p-6">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="p-2 bg-orange-600/20 rounded-lg">
                              <TrendingUp className="w-4 h-4 text-orange-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">
                              Data Visualization
                            </h3>
                          </div>
                          <div className="mt-4">
                            <DataVisualization data={results.results} />
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-900">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>Total Records: {analysisData.rowCount}</span>
                              <span>Columns: {analysisData.columnCount}</span>
                            </div>
                          </div>
                        </Card>
                      )}

                    {analysisData && analysisData.isSingleValue && (
                      <Card className="p-8 bg-gradient-to-br from-cyan-600/10 to-blue-500/10 border-cyan-600/30 flex flex-col items-center justify-center">
                        <div className="p-3 bg-cyan-600/20 rounded-full mb-4">
                          <Activity className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-sm text-gray-200 mb-2 uppercase tracking-wide">
                          {analysisData.keys[0]}
                        </p>
                        <motion.p
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                          className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300"
                        >
                          {analysisData.values[0]}
                        </motion.p>
                      </Card>
                    )}

                    {analysisData && !analysisData.isSingleValue && (
                      <Card className="p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="p-2 bg-pink-500/20 rounded-lg">
                            <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                          </div>
                          <h3 className="text-sm font-semibold text-white">
                            Results Data
                          </h3>
                        </div>
                        <ResultsTable data={results.results} />
                      </Card>
                    )}

                    {/* Query Results Summary - Simplified */}
                    {analysisData && (
                      <Card className="p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                              <Activity className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">
                              Query Results
                            </h3>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Records</p>
                              <p className="text-lg font-bold text-cyan-300">{analysisData.rowCount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Columns</p>
                              <p className="text-lg font-bold text-emerald-300">{analysisData.columnCount}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Status</p>
                              <p className="text-lg font-bold text-green-300">✓</p>
                            </div>
                          </div>
                        </div>
                        {analysisData.keys.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {analysisData.keys.map((key, idx) => {
                              const colors = [
                                'bg-rose-600/20 text-rose-300 border-rose-600/30',
                                'bg-orange-600/20 text-orange-300 border-orange-600/30',
                                'bg-amber-600/20 text-amber-300 border-amber-600/30',
                                'bg-lime-600/20 text-lime-300 border-lime-600/30',
                                'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
                                'bg-teal-600/20 text-teal-300 border-teal-600/30',
                                'bg-cyan-600/20 text-cyan-300 border-cyan-600/30',
                                'bg-sky-600/20 text-sky-300 border-sky-600/30',
                                'bg-indigo-600/20 text-indigo-300 border-indigo-600/30',
                                'bg-violet-600/20 text-violet-300 border-violet-600/30',
                                'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-600/30',
                                'bg-pink-600/20 text-pink-300 border-pink-600/30',
                              ];
                              return (
                                <span
                                  key={idx}
                                  className={`px-3 py-1 text-xs rounded-full border ${colors[idx % colors.length]}`}
                                >
                                  {key}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    )}
                  </div>

                  {/* 3. Key Insights - LAST (only if available) */}
                  {visualizations && visualizations.insights && (
                    <InsightsPanel 
                      insights={visualizations.insights}
                      summary={visualizations.summary}
                      hideIfRedundant={true}
                    />
                  )}
                </motion.div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-gray-950/50 rounded-full">
                      <Activity className="w-16 h-16 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium mb-2">No Analysis Yet</p>
                      <p className="text-gray-600 text-sm">
                        Upload a file and ask a question to see dynamic analysis results
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

AnalysisPage.propTypes = {
  selectedQuestion: PropTypes.string,
  onBackToDashboard: PropTypes.func,
};
