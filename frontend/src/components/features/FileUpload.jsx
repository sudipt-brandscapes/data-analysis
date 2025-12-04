import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Upload } from 'lucide-react';
import PropTypes from 'prop-types';
import { Card, Button, ErrorMessage } from '../common';

export const FileUpload = ({ onFileUpload }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [lastUploadedFile, setLastUploadedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onFileUpload(file);
      setUploadStatus('File uploaded successfully! You can now analyze your data.');
      setLastUploadedFile(file.name);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Upload Your Data</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-800 hover:border-blue-400 hover:bg-gray-900/50'
        }`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <div className="space-y-2">
          <p className="text-lg text-gray-300">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-400">or click to select a file</p>
          {file && <p className="text-sm text-blue-400">Selected: {file.name}</p>}
          {!file && lastUploadedFile && (
            <div className="mt-4">
              <p className="text-sm text-green-400">Last uploaded: {lastUploadedFile}</p>
              <p className="text-xs text-gray-400 mt-1">Drop a new file to replace</p>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleFileUpload}
        disabled={loading || !file}
        icon={Upload}
        variant="primary"
        className="w-full"
      >
        {loading ? 'Uploading...' : 'Upload File'}
      </Button>

      {uploadStatus && <p className="text-green-400 text-sm">{uploadStatus}</p>}
      {error && <ErrorMessage message={error} onClose={() => setError('')} />}
    </Card>
  );
};

FileUpload.propTypes = {
  onFileUpload: PropTypes.func.isRequired,
};
