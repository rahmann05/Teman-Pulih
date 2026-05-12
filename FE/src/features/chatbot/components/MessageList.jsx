import { useRef, useEffect } from 'react';
import { useChatbot } from '../../../hooks/useChatbot';
import { ChatWelcome } from '../../../components/domain/chatbot/ChatWelcome';
import { ChatTyping } from '../../../components/domain/chatbot/ChatTyping';
import { ChatBubble } from '../../../components/domain/chatbot/ChatBubble';

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

      {isSending && <ChatTyping />}
      <div ref={messagesEndRef} />
    </main>
  );
};
