import { LuHeartPulse } from 'react-icons/lu';
import FormattedText from '../../ui/chatbot/FormattedText';

export const ChatBubble = ({ message }) => {
  return (
    <div className={`chat-bubble-wrapper chat-bubble-wrapper--${message.sender}`}>
      <div className={`chat-bubble-avatar chat-bubble-avatar--${message.sender}`}>
        {message.sender === 'ai' ? (
          <img src="/assets/asep.png" alt="Asep" className="chat-avatar-image" />
        ) : (
          ''
        )}
      </div>
      <div>
        <div className={`chat-bubble chat-bubble--${message.sender}`}>
          {message.sender === 'ai' ? (
            <>
              {message.message ? (
                <FormattedText text={message.message} />
              ) : message.isStreaming ? (
                <span className="chat-thinking">Sedang berpikir</span>
              ) : null}
              {message.isStreaming && <span className="chat-bubble-cursor" />}
            </>
          ) : (
            message.message
          )}
        </div>
        <div className="chat-bubble-time">
          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  );
};
