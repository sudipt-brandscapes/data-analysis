import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Database, FileSpreadsheet } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';
import { Button, ProgressBar } from '../common';

export const Sidebar = ({
  file,
  uploading,
  uploadProgress,
  onFileSelect,
  onBackToDashboard,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    onDrop: (acceptedFiles) => {
      onFileSelect(acceptedFiles[0]);
    },
  });

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 h-screen bg-gray-950 border-r border-gray-900 flex flex-col flex-shrink-0"
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DataWise</h1>
        </div>
      </div>

      {/* Back to Dashboard Button */}
      {onBackToDashboard && (
        <div className="px-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToDashboard}
            className="w-full"
          >
            ← Back to Dashboard
          </Button>
        </div>
      )}

      {/* Upload Section */}
      <div className="p-4 flex-shrink-0">
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-gray-400 mb-3">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Upload Data</span>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-900 hover:border-gray-800 bg-gray-950/30'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {isDragActive ? 'Drop file here' : 'Drag & drop file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or browse</p>
          </div>

          {/* File Info */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-gray-950/50 rounded-lg border border-gray-900"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{file.name}</p>
                  </div>
                </div>
                {uploading && (
                  <div className="mt-2">
                    <ProgressBar progress={uploadProgress} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

Sidebar.propTypes = {
  file: PropTypes.object,
  uploading: PropTypes.bool,
  uploadProgress: PropTypes.number,
  onFileSelect: PropTypes.func.isRequired,
  onBackToDashboard: PropTypes.func,
};
