import axios from 'axios';
import { API_CONFIG } from '../constants/config';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 120000, // 120 seconds (2 minutes) - in milliseconds
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/api/analysis/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const executeAnalysis = async (query) => {
  try {
    const response = await api.post('/api/analysis/', {
      query: query,
    });
    return response.data;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};

export const generateVisualizations = async (results, question) => {
  try {
    // Limit data sent to backend - only send first 1000 rows for visualization
    const limitedResults = results.length > 1000 ? results.slice(0, 1000) : results;
    
    const response = await api.post('/api/visualize/', {
      results: limitedResults,
      question: question,
    });
    return response.data;
  } catch (error) {
    console.error('Visualization error:', error);
    throw error;
  }
};

export const saveResults = async (results) => {
  try {
    const response = await api.post('/api/save-results/', {
      results: results,
    }, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
};

export default api;
