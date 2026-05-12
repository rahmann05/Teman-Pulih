import { LuHeartPulse } from 'react-icons/lu';

const FormattedText = ({ text }) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  let inList = false;
  const elements = [];
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${key}`}>{listItems}</ul>);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    let htmlLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    if (htmlLine.trim().startsWith('• ') || htmlLine.trim().startsWith('- ')) {
      inList = true;
      listItems.push(
        <li key={index} dangerouslySetInnerHTML={{ __html: htmlLine.replace(/^[•-]\s*/, '') }} />
      );
    } else {
      flushList(index);
      if (htmlLine.trim() === '') {
        elements.push(<br key={index} />);
      } else {
        elements.push(<div key={index} dangerouslySetInnerHTML={{ __html: htmlLine }} />);
      }
    }
  });
  flushList('end');

  return <>{elements}</>;
};

export const ChatBubble = ({ message }) => {
  return (
    <div className={`chat-bubble-wrapper chat-bubble-wrapper--${message.sender}`}>
      <div className={`chat-bubble-avatar chat-bubble-avatar--${message.sender}`}>
        {message.sender === 'ai' ? <LuHeartPulse /> : ''}
      </div>
      <div>
        <div className={`chat-bubble chat-bubble--${message.sender}`}>
          {message.sender === 'ai' ? (
            <FormattedText text={message.message} />
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
