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
    setError(null);

    let aiMsgId = null;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s initial timeout (RAG + Extraction bisa memakan waktu)

      const response = await fetch(`${apiUrl}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-active-role': localStorage.getItem('role')
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengirim pesan');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      aiMsgId = 'ai-' + Date.now();
      const openingText = "Baik Asep, bantu jawab pertanyaannya ya.\n\n";
      let accumulatedText = openingText;
      let isDoneReceived = false;
      let lastActivity = Date.now();
      let buffer = ''; // Buffer untuk menangani baris yang terpotong
      
      // Initial AI message
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        message: openingText, 
        sender: 'ai', 
        created_at: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true 
      }]);

      // Watchdog timer to detect hung streams (diperlonggar ke 25 detik)
      const watchdog = setInterval(() => {
        if (!isDoneReceived && Date.now() - lastActivity > 25000) {
          console.warn("Stream hung detected. Forcing fallback after long wait.");
          clearInterval(watchdog);
          controller.abort(); 
          
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { 
              ...m, 
              message: 'Asep minta maaf, koneksi Asep terputus nih. Tolong coba lagi beberapa saat ya.', 
              isStreaming: false 
            } : m
          ));
        }
      }, 2000);

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          lastActivity = Date.now();
          buffer += decoder.decode(value, { stream: true });

          // Pecah buffer berdasarkan newline
          const lines = buffer.split('\n');
          // Simpan baris terakhir yang mungkin belum lengkap kembali ke buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.includes('[DONE]')) {
              isDoneReceived = true;
              break;
            }

            if (trimmedLine.startsWith('data: ')) {
              try {
                const json = trimmedLine.replace('data: ', '');
                const data = JSON.parse(json);
                
                if (data.text) {
                  accumulatedText += data.text;
                  setMessages(prev => prev.map(m => 
                    m.id === aiMsgId ? { ...m, message: accumulatedText } : m
                  ));
                } else if (data.error) {
                  isDoneReceived = true;
                  setMessages(prev => prev.map(m => 
                    m.id === aiMsgId ? { ...m, message: data.error, isStreaming: false } : m
                  ));
                  return;
                }
              } catch (e) {
                console.warn("Gagal parse chunk JSON:", e, trimmedLine);
              }
            }
          }

          if (isDoneReceived) break;
        }
      } finally {
        clearInterval(watchdog);
      }

      // Final check
      if (!isDoneReceived) {
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { 
            ...m, 
            message: 'Asep minta maaf, Asep lagi nggak bisa diakses nih. Tolong coba lagi beberapa saat ya.', 
            isStreaming: false 
          } : m
        ));
      } else {
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { ...m, isStreaming: false } : m
        ));
      }
    } catch (err) {
      if (err.name === 'AbortError') return; 
      
      // Jika terjadi error saat pengiriman, pastikan pesan AI yang sedang 'loading' diisi dengan pesan error
      if (aiMsgId) {
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { 
            ...m, 
            message: 'Asep minta maaf, Asep lagi nggak bisa diakses nih. Tolong coba lagi beberapa saat ya.', 
            isStreaming: false 
          } : m
        ));
      }
      setError(err.message || 'Gagal mengirim pesan');
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
