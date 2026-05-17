import { useRef, useEffect } from 'react';
import { useChatbot } from '@/features/chatbot/hooks/useChatbot';
import { ChatWelcome } from '@/features/chatbot/components/ChatWelcome';
import { ChatTyping } from '@/features/chatbot/components/ChatTyping';
import { ChatBubble } from '@/features/chatbot/components/ChatBubble';

export const MessageList = () => {
  const { messages, isLoading, isSending } = useChatbot();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  return (
    <main className="chat-messages">
      {messages.length === 0 && !isLoading ? (
        <ChatWelcome />
      ) : (
        messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))
      )}

      {isSending && !messages.some(m => m.isStreaming) && <ChatTyping />}
      <div ref={messagesEndRef} />
    </main>
  );
};
