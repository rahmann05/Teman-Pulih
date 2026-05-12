import { LuHeartPulse, LuTrash2 } from 'react-icons/lu';
import { useChatbot } from '../../../hooks/useChatbot';

export const ChatHeader = () => {
  const { messages, clearHistory } = useChatbot();

  return (
    <header className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="chat-header-avatar">
          <LuHeartPulse />
        </div>
        <div className="chat-header-info">
          <h1 className="chat-header-name">Teman Pulih AI</h1>
          <span className="chat-header-status online">Online</span>
        </div>
      </div>
      {messages.length > 0 && (
        <button 
          onClick={() => { if(window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat percakapan?')) clearHistory(); }}
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
          aria-label="Hapus Riwayat Chat"
          title="Hapus Riwayat"
        >
          <LuTrash2 size={20} />
        </button>
      )}
    </header>
  );
};
