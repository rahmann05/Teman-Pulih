import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { getDirectMessages, sendDirectMessage } from '../services/chatService';
import { getFamilyMembers } from '@/features/family-sync/services/familyService';
import { supabase } from '@/shared/config/supabaseClient';

import '../chat.css';

const DirectChatPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchRecipient = async () => {
      try {
        const response = await getFamilyMembers();
        const members = response.data?.members || [];
        const found = members.find(m => m.userId === parseInt(userId, 10));
        if (found) {
          setRecipient(found);
        }
      } catch (err) {
        console.error('Gagal memuat info penerima:', err);
      }
    };
    fetchRecipient();
  }, [userId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getDirectMessages(userId);
        setMessages(data.messages || []);
      } catch (err) {
        setError('Gagal memuat pesan');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    // Subscribe to realtime changes in direct_messages table
    const channel = supabase
      .channel(`chat_${user.id}_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new;
          // Only add if it's relevant to this chat
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === parseInt(userId)) ||
            (newMsg.sender_id === parseInt(userId) && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input;
    setInput('');
    try {
      await sendDirectMessage(userId, content);
      // Realtime subscription will append it, so we don't necessarily need to add it here, 
      // but to be responsive we can rely on realtime.
    } catch (err) {
      setError('Gagal mengirim pesan');
    }
  };

  return (
    <DashboardLayout>
      <div className="direct-chat-container">
        <div className="direct-chat-header">
          <div className="chat-header-left">
            <button className="back-btn" onClick={() => navigate(-1)} aria-label="Kembali">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
            <div className="chat-header-avatar-direct">
              {recipient?.initials || '?'}
            </div>
            <div className="chat-header-info">
              <span className="chat-header-eyebrow">{recipient?.roleLine || 'Koneksi'}</span>
              <h1 className="chat-header-name">{recipient?.name || 'Pengguna'}</h1>
              <span className="chat-header-status online">Koneksi Aktif</span>
            </div>
          </div>
        </div>

        <div className="direct-chat-messages">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Memuat pesan...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
              Belum ada pesan. Kirim pesan pertama!
            </p>
          ) : (
            messages.map((msg, index) => {
              const isSent = msg.sender_id === user.id;
              const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={msg.id || index} className={`direct-message-bubble ${isSent ? 'sent' : 'received'}`}>
                  <div>{msg.content}</div>
                  <span className="direct-message-time">{time}</span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="direct-chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ketik pesan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default DirectChatPage;
