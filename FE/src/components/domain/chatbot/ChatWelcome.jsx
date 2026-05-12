import { LuBot } from 'react-icons/lu';

export const ChatWelcome = () => {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-icon">
        <LuBot />
      </div>
      <h2 className="chat-welcome-title">Halo! Saya Chatbot AI</h2>
      <p className="chat-welcome-desc">
        Asisten medis digital Anda. Ada yang bisa saya bantu terkait pemulihan atau obat Anda hari ini?
      </p>
    </div>
  );
};
