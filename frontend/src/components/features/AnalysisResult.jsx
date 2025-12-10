import { motion } from 'framer-motion';
import {
  MessageSquare,
  FileSpreadsheet,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, LoadingSpinner } from '../common';
import { DataVisualization, ResultsTable, AdvancedCharts, InsightsPanel } from '../features';

export const AnalysisResult = ({ result, visualizations, loadingViz }) => {
  const analysisData = useMemo(() => {
    if (!result || !result.results || result.results.length === 0) {
      return null;
    }

    const data = result.results;
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
  }, [result]);

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* 1. Query Explanation */}
      {result.explanation && (
        <div className="prose prose-invert max-w-none">
            <div className="flex gap-4">
              <div className="p-2 h-fit bg-blue-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-200">Analysis</h3>
                <p className="text-gray-300 leading-relaxed text-[15px]">
                  {result.explanation}
                </p>
              </div>
            </div>
        </div>
      )}

      {/* 2. Advanced Charts */}
      {visualizations?.charts?.length > 0 && (
        <AdvancedCharts charts={visualizations.charts} />
      )}
      
      {loadingViz && (
          <Card className="p-8 text-center bg-gray-900/30 border-gray-800 border-dashed">
            <LoadingSpinner size="md" text="Creating visualizations..." />
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analysisData &&
          analysisData.hasNumericData &&
          analysisData.isMultipleRows && (
            <Card className="p-0 overflow-hidden border-gray-800 bg-gray-900/40">
              <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-medium text-gray-200">Trends</h3>
              </div>
              <div className="p-4">
                <DataVisualization data={result.results} />
              </div>
            </Card>
          )}

        {analysisData && analysisData.isSingleValue && (
          <Card className="p-8 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-800/30 flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-medium">
              {analysisData.keys[0]}
            </p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
            >
              {analysisData.values[0]}
            </motion.p>
          </Card>
        )}

        {analysisData && !analysisData.isSingleValue && (
          <Card className="p-0 overflow-hidden border-gray-800 bg-gray-900/40 col-span-full">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-medium text-gray-200">Raw Data</h3>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                  <span>{analysisData.rowCount} rows</span>
                  <span>{analysisData.columnCount} columns</span>
              </div>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <ResultsTable data={result.results} />
            </div>
          </Card>
        )}
      </div>

      {/* 3. Key Insights */}
      {visualizations?.insights && (
        <InsightsPanel 
          insights={visualizations.insights}
          summary={visualizations.summary}
          hideIfRedundant={true}
        />
      )}
    </motion.div>
  );
};

AnalysisResult.propTypes = {
  result: PropTypes.object,
  visualizations: PropTypes.object,
  loadingViz: PropTypes.bool,
};
