import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Database, FileSpreadsheet, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';
import { Button, ProgressBar } from '../common';
import { getChatHistory, deleteChatHistory, getChatSessions } from '../../services/api';

export const Sidebar = ({
  file,
  uploading,
  uploadProgress,
  onFileSelect,
  onBackToDashboard,
  onChatSelect,
  onNewChat,
}) => {
  const [sessions, setSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoadingHistory(true);
      const data = await getChatSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteChat = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteChatHistory(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

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

      {/* New Chat Button */}
      <div className="px-4 pt-2">
           <Button
             variant="primary"
             size="sm"
             onClick={onNewChat}
             className="w-full bg-blue-600 hover:bg-blue-500 text-white"
           >
             + New Chat
           </Button>
      </div>

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

      {/* History Section */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center space-x-2 text-gray-400 mb-3">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Recent Analysis</span>
        </div>

        <div className="space-y-2">
          {loadingHistory ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onChatSelect && onChatSelect(session)}
                className="group p-3 rounded-lg bg-gray-900/30 hover:bg-gray-900 border border-transparent hover:border-gray-800 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 overflow-hidden">
                    <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                        {session.title || 'Untitled Session'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-xs">
              No history yet
            </div>
          )}
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
  onChatSelect: PropTypes.func,
  onNewChat: PropTypes.func,
};
