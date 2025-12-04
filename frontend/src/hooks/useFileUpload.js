import { useState } from 'react';
import { uploadFile } from '../services/api';

export const useFileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setError('');
    
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      await uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetFile = () => {
    setFile(null);
    setError('');
    setUploadProgress(0);
  };

  return {
    file,
    uploading,
    uploadProgress,
    error,
    handleFileSelect,
    resetFile,
  };
};
