/* src/components/ui/chatbot/FormattedText.jsx */

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

export default FormattedText;
