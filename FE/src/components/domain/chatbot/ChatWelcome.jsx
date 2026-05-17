import { LuHeartPulse } from 'react-icons/lu';

export const ChatWelcome = () => {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-icon">
        <LuHeartPulse size={38} />
      </div>
      <p className="chat-welcome-eyebrow">Asisten AI</p>
      <h2 className="chat-welcome-title">Halo! Saya Asep,<br />Asisten Pulih Anda</h2>
      <p className="chat-welcome-desc">
        Tanya apa saja seputar pemulihan, jadwal obat, atau kondisi kesehatan Anda. Saya selalu siap membantu.
      </p>
    </div>
  );
};
