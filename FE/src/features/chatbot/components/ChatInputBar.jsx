import { useState } from 'react';
import { LuSend } from 'react-icons/lu';
import { useChatbot } from '../../../hooks/useChatbot';

export const ChatInputBar = () => {
  const { isSending, send } = useChatbot();
  const [inputValue, setInputValue] = useState('');

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isSending) return;
    send(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form className="chat-input-bar" onSubmit={handleSend}>
      <textarea
        className="chat-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ketik pesan..."
        disabled={isSending}
        rows={1}
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={!inputValue.trim() || isSending}
        aria-label="Kirim pesan"
      >
        <LuSend />
      </button>
    </form>
  );
};
