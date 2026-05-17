import { LuHeartPulse } from 'react-icons/lu';

export const ChatTyping = () => {
  return (
    <div className="chat-typing-wrapper">
      <div className="chat-bubble-avatar chat-bubble-avatar--ai">
        <LuHeartPulse />
      </div>
      <div className="chat-typing">
        <div className="chat-typing-dot"></div>
        <div className="chat-typing-dot"></div>
        <div className="chat-typing-dot"></div>
      </div>
    </div>
  );
};
