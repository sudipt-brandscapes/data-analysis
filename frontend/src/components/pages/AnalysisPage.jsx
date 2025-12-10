import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  User,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { Sidebar } from '../layout';
import { QueryInput, AnalysisResult } from '../features';
import { LoadingSpinner, ErrorMessage } from '../common';
import { uploadFile, executeAnalysis, generateVisualizations, getChatHistory } from '../../services/api';

export const AnalysisPage = ({ selectedQuestion = '', initialSessionId = null, isNewSession = false, onBackToDashboard }) => {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  // chatItems structure: { type: 'user' | 'analysis', content?: string, result?: object, visualizations?: object, id: string }
  const [chatItems, setChatItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingViz, setLoadingViz] = useState(false);
  // Track the ID of the item currently loading visualization
  const [analyzingItemId, setAnalyzingItemId] = useState(null); 
  const bottomRef = useRef(null);

  // Simple UUID generator
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleNewChat = () => {
      const newId = generateUUID();
      localStorage.setItem('analysis_session_id', newId);
      window.location.reload(); 
  };
  
  const [sessionIdState, setSessionIdState] = useState(() => {
    // If explicit new session requested
    if (isNewSession) {
        const newId = generateUUID();
        localStorage.setItem('analysis_session_id', newId);
        return newId;
    }
    // If specific session requested
    if (initialSessionId) {
        localStorage.setItem('analysis_session_id', initialSessionId);
        return initialSessionId;
    }
    // Otherwise check storage or create new default
    const stored = localStorage.getItem('analysis_session_id');
    if (stored) return stored;
    const newId = generateUUID();
    localStorage.setItem('analysis_session_id', newId);
    return newId;
  });

  useEffect(() => {
      // If we receive a new session instruction via props that differs from current state
      if (isNewSession) {
           // Check if we are ALREADY on a new session to avoid infinite loops or overwrites if we navigated here
           // But since isNewSession comes from URL, validation is tricky.
           // However, useState initialization handles the FIRST render. 
           // This useEffect handles subsequent updates if props change (unlikely for URL params without navigation)
           // But let's be safe. If we are forced new, we ensure we have a fresh ID.
           // actually, the useState init logic is enough for the initial load.
           // We only need to react if initialSessionId changes.
      } else if (initialSessionId && initialSessionId !== sessionIdState) {
          setSessionIdState(initialSessionId);
          localStorage.setItem('analysis_session_id', initialSessionId);
      }
  }, [initialSessionId, isNewSession]);

  const startNewChat = () => {
     const newId = generateUUID();
     localStorage.setItem('analysis_session_id', newId);
     setSessionIdState(newId);
     setChatItems([]);
     setQuery('');
     setFile(null);
     setIsFileUploaded(false);
  };

  useEffect(() => {
    const loadHistory = async () => {
        try {
            const history = await getChatHistory(sessionIdState);
            if (history && history.length > 0) {
                const formattedHistory = [];
                history.reverse().forEach(item => { 
                   formattedHistory.push({
                       id: `user-${item.id}`,
                       type: 'user',
                       content: item.query
                   });
                   formattedHistory.push({
                        id: `ai-${item.id}`,
                        type: 'analysis',
                        result: { 
                            explanation: item.response, 
                            results: [] 
                        },
                        visualizations: null 
                   });
                });
                setChatItems(formattedHistory);
            } else {
                setChatItems([]);
            }
        } catch (err) {
            console.error("Failed to load history", err);
            setChatItems([]);
        }
    };
    if (sessionIdState) {
        loadHistory();
    }
  }, [sessionIdState]);

  useEffect(() => {
    if (selectedQuestion) {
      setQuery(selectedQuestion);
    }
  }, [selectedQuestion]);

  useEffect(() => {
     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatItems, loading, loadingViz]);

  const handleFileSelect = (selectedFile) => {
    startNewChat(); // Start new chat on file select
    setFile(selectedFile);
    setError('');
    handleFileUpload(selectedFile);
  };

  const [isFileUploaded, setIsFileUploaded] = useState(false);

  const handleFileUpload = async (uploadFileParam) => {
    const fileToUpload = uploadFileParam || file;
    if (!fileToUpload) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setIsFileUploaded(false);

    try {
      await uploadFile(fileToUpload, sessionIdState, (progress) => {
        setUploadProgress(progress);
      });

      setIsFileUploaded(true);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      setError('Failed to upload file. Please try again.');
      setUploading(false);
      setUploadProgress(0);
      setIsFileUploaded(false);
    }
  };

  const handleAnalyze = async (queryText) => {
    if (!file || !queryText.trim()) {
      setError('Please provide a question');
      return;
    }

    if (!isFileUploaded) {
      setError('Please wait for the file to finish uploading');
      return;
    }

    const newQueryId = generateUUID();
    const userItem = { id: `user-${newQueryId}`, type: 'user', content: queryText };
    setChatItems(prev => [...prev, userItem]);
    
    setLoading(true);
    setError('');
    setAnalyzingItemId(newQueryId);

    try {
      const data = await executeAnalysis(queryText, sessionIdState);
      
      const aiItemId = `ai-${newQueryId}`;
      const aiItem = {
          id: aiItemId,
          type: 'analysis',
          result: data,
          visualizations: null 
      };
      
      setChatItems(prev => [...prev, aiItem]);

      if (data.results && data.results.length > 0) {
        setLoadingViz(true);
        try {
          const vizData = await generateVisualizations(data.results, queryText);
          setChatItems(prev => prev.map(item => 
              item.id === aiItemId 
                ? { ...item, visualizations: vizData } 
                : item
          ));
        } catch (vizError) {
          console.error('Visualization error:', vizError);
        } finally {
          setLoadingViz(false);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      setAnalyzingItemId(null);
    }
  };
  
  const hasInteracted = chatItems.length > 0 || loading;

  const handleChatSelect = (session) => {
      localStorage.setItem('analysis_session_id', session.id);
      setSessionIdState(session.id);
      setIsFileUploaded(true); // Assume file uploaded for past sessions? Or check sidebar metadata?
      // Better to reset file upload state or assume valid if history exists.
      // But user might want to continue analyzing. 
      // If session exists, we load history. `isFileUploaded` prevents new analysis if false.
      // We should probably allow analysis if session context is rich, but strictly requiring file re-upload is safer for now
      // unless we store file metadata in session.
      // For now, let's NOT block analysis if we are viewing history, or maybe just leave it as is.
      // Actually, if they switch sessions, they might need to re-upload file if the backend doesn't persist file context per session effectively in 'uploads' schema.
      // The current backend clears 'uploads' schema on new file upload.
      // So old sessions might not work for NEW queries if the file is gone. 
      // This is a known limitation. We will just load the history.
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-gray-100">
      <Sidebar
        file={file}
        uploading={uploading}
        uploadProgress={uploadProgress}
        onFileSelect={handleFileSelect}
        onBackToDashboard={onBackToDashboard}
        onNewChat={startNewChat}
        onChatSelect={handleChatSelect}
      />

      <div className="flex-1 flex flex-col h-screen relative bg-gradient-to-br from-gray-950 via-black to-gray-950">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            
            {!hasInteracted ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                 <motion.div 
                   layout
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ duration: 0.5 }}
                   className="w-full max-w-3xl space-y-8"
                 >
                    <div className="text-center space-y-4">
                       <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
                          <Activity className="w-8 h-8 text-white" />
                       </div>
                    </div>
                    
                    <QueryInput
                      onAnalyze={handleAnalyze}
                      loading={loading}
                      initialQuery={query}
                      mode="centered"
                    />

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto"
                      >
                         <ErrorMessage message={error} onClose={() => setError('')} />
                      </motion.div>
                    )}
                 </motion.div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-32">
                 {chatItems.map((item) => (
                    <div key={item.id} className="space-y-4">
                        {item.type === 'user' ? (
                            <div className="flex justify-end">
                                <div className="bg-gray-800 text-white rounded-2xl rounded-tr-sm px-6 py-4 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-1">
                                       <User className="w-4 h-4 text-gray-400" />
                                       <span className="text-xs font-medium text-gray-400">You</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{item.content}</p>
                                </div>
                            </div>
                        ) : (
                           <AnalysisResult 
                              result={item.result} 
                              visualizations={item.visualizations}
                              loadingViz={loadingViz && !item.visualizations && analyzingItemId === item.id?.replace('ai-', '')} 
                           />
                        )}
                    </div>
                 ))}

                 {/* Loading Indicator at Bottom */}
                 {loading && (
                    <div className="flex justify-start">
                         <div className="bg-gray-900/50 rounded-2xl px-8 py-6 flex items-center gap-4">
                             <LoadingSpinner size="sm" />
                             <span className="text-gray-400 animate-pulse">Analyzing logic...</span>
                         </div>
                    </div>
                 )}
                 
                 <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Fixed Input Area for "Bottom Mode" */}
          <AnimatePresence>
            {hasInteracted && (
               <motion.div
                 initial={{ y: 100, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: 100, opacity: 0 }}
                 className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-20"
               >
                  <div className="max-w-3xl mx-auto">
                     {error && (
                         <div className="mb-4">
                            <ErrorMessage message={error} onClose={() => setError('')} />
                         </div>
                     )}
                     <QueryInput
                        onAnalyze={handleAnalyze}
                        loading={loading}
                        initialQuery={""} 
                        mode="bottom"
                      />
                      <p className="text-center text-xs text-gray-600 mt-2">
                         DataWise can make mistakes. Verify important information.
                      </p>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>

      </div>
    </div>
  );
};

AnalysisPage.propTypes = {
  selectedQuestion: PropTypes.string,
  onBackToDashboard: PropTypes.func,
};
