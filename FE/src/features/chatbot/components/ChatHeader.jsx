import { LuTrash2 } from 'react-icons/lu';
import { useChatbot } from '@/features/chatbot/hooks/useChatbot';

export const ChatHeader = () => {
  const { messages, clearHistory } = useChatbot();

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <div className="chat-header-avatar">
          <img src="/assets/asep.png" alt="Asep" className="chat-avatar-image" />
        </div>
        <div className="chat-header-info">
          <p className="chat-header-eyebrow">Konsultasi</p>
          <h1 className="chat-header-name">Asep (Asisten Pulih)</h1>
          <span className="chat-header-status online">Selalu ada buat kamu</span>
        </div>
      </div>
      {messages.length > 0 && (
        <button
          onClick={() => {
            if (window.confirm('Hapus seluruh riwayat percakapan?')) clearHistory();
          }}
          className="chat-header-clear"
          aria-label="Hapus Riwayat Chat"
          title="Hapus Riwayat"
        >
          <LuTrash2 size={18} />
        </button>
      )}
    </header>
  );
};
