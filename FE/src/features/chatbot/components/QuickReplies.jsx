import { useChatbot } from '../../../hooks/useChatbot';

const QUICK_REPLIES = [
  "Apa efek samping obat ini?",
  "Bagaimana dosis yang aman?",
  "Kapan harus ke dokter?",
  "Jelaskan resep saya"
];

export const QuickReplies = () => {
  const { messages, isSending, send } = useChatbot();

  if (isSending || messages.length > 0) return null;

  return (
    <div className="chat-quick-replies">
      {QUICK_REPLIES.map((reply, i) => (
        <button
          key={i}
          className="chat-quick-chip"
          onClick={() => send(reply)}
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
