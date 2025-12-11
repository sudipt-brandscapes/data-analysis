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

import { useNavigate } from 'react-router-dom';

export const AnalysisPage = ({ selectedQuestion = '', urlSessionId = null, onBackToDashboard }) => {
  const navigate = useNavigate();
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
      // Navigate to root analysis, which will redirect to new UUID
      navigate('/analysis');
  };
  
  // NOTE: Session ID is controlled by URL.
  // If URL has ID, we use it. If not, we wait for user to start chat.
  const [sessionIdState, setSessionIdState] = useState(urlSessionId);

  useEffect(() => {
      if (urlSessionId) {
          setSessionIdState(urlSessionId);
          localStorage.setItem('analysis_session_id', urlSessionId);
      } else {
          setSessionIdState(null);
          // Don't auto-generate or redirect yet.
      }
  }, [urlSessionId]);

  const startNewChat = () => {
     handleNewChat();
  };

  useEffect(() => {
    const loadHistory = async () => {
        // If loading (analyzing), don't overwrite optimistic UI with empty history
        if (loading) return;

        if (!sessionIdState) {
            setChatItems([]);
            return;
        }
        
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
    loadHistory();
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

  /* New Ref for AbortController */
  const abortControllerRef = useRef(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      // Optional: Add a system message saying "Analysis stopped by user"
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
    const aiItemId = `ai-${newQueryId}`;
    /* Initialize AI Item with empty content for streaming */
    const aiItem = {
          id: aiItemId,
          type: 'analysis',
          result: { explanation: '', results: [] }, // Start empty
          visualizations: null 
    };

    setChatItems(prev => [...prev, userItem, aiItem]);
    
    setLoading(true);
    setError('');
    setAnalyzingItemId(newQueryId);
    
    // Create AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Determine Session ID (existing or new)
    let currentSessionId = sessionIdState;
    if (!currentSessionId) {
        currentSessionId = generateUUID();
        // Update URL to reflect new session, but don't force reload
        navigate(`/analysis/${currentSessionId}`, { replace: true });
        setSessionIdState(currentSessionId); 
    }

    try {
      // Import dynamically or assume it's imported at top
      const { streamAnalysis } = await import('../../services/api'); // Dynamic import to ensure latest

      await streamAnalysis(queryText, currentSessionId, {
          onToken: (token) => {
               setChatItems(prev => prev.map(item => 
                   item.id === aiItemId 
                   ? { 
                       ...item, 
                       result: { 
                           ...item.result, 
                           explanation: (item.result.explanation || '') + token 
                       } 
                   } 
                   : item
               ));
          },
          onStatus: (status) => {
               // Optional: Show status indicator
               // For now, maybe prepending to explanation or separate status UI?
               // Let's just ignore or console log for now, or update a status bar
               console.log("Status:", status);
          },
          onComplete: async (data) => {
               // Update with final data structure (has results, sql, etc)
               // Note: data.explanation might be full text, but we streamed it. 
               // Using streamed text is better visulally.
               setChatItems(prev => prev.map(item => 
                   item.id === aiItemId 
                   ? { 
                       ...item, 
                       result: data 
                   } 
                   : item
               ));

               if (data.results && data.results.length > 0) {
                    setLoadingViz(true);
                    try {
                        const vizData = await generateVisualizations(data.results, queryText);
                        setChatItems(prev => prev.map(item => 
                            item.id === aiItemId 
                                ? { ...item, visualizations: vizData } 
                                : item
                        ));
                    } catch (e) {
                        console.error("Viz Error", e);
                    } finally {
                        setLoadingViz(false);
                    }
               }
               setLoading(false);
               abortControllerRef.current = null;
          },
          onError: (errMsg) => {
               setError(errMsg);
               setLoading(false);
               abortControllerRef.current = null;
          }
      }, controller.signal); // Pass signal

    } catch (error) {
      console.error('Analysis error:', error);
      setError('Analysis failed.');
      setLoading(false);
      abortControllerRef.current = null;
    } finally {
      // setLoading(false); // Done in onComplete/onError
      setAnalyzingItemId(null);
    }
  };
  
  const hasInteracted = chatItems.length > 0 || loading;

  const handleChatSelect = (session) => {
      navigate(`/analysis/${session.id}`);
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
                      onStop={handleStop}
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
