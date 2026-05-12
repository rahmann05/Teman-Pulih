import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatContext } from './ChatContext';
import { sendMessage, getChatHistory, clearChatHistory } from '../services/chatbotService';

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [contextHandled, setContextHandled] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getChatHistory();
      const data = response.data?.data || response.data || [];
      setMessages(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to load history:", err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const send = useCallback(async (text) => {
    if (!text.trim()) return;

    const tempId = Date.now().toString();
    const userMsg = {
      id: tempId,
      message: text,
      sender: 'user',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await sendMessage(text);
      const aiReply = response.data?.reply || response.data?.data?.reply;
      if (aiReply) {
        setMessages(prev => [...prev, aiReply]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mengirim pesan');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (contextHandled) return;
    
    const contextText = searchParams.get('context');
    if (contextText) {
      setContextHandled(true);
      const prompt = `Tolong jelaskan resep berikut:\n\n${contextText}`;
      send(prompt);
      
      searchParams.delete('context');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, send, contextHandled]);

  const clearHistory = useCallback(async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isLoading, isSending, error, send, loadHistory, clearHistory }}>
      {children}
    </ChatContext.Provider>
  );
};
