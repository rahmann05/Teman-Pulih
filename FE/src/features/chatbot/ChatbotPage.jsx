import DashboardLayout from '../../components/layout/DashboardLayout';
import { ChatProvider } from '../../context/ChatProvider';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { QuickReplies } from './components/QuickReplies';
import { ChatInputBar } from './components/ChatInputBar';
import '../../styles/features/Chatbot.css';

const ChatbotPage = () => {
  return (
    <DashboardLayout>
      <ChatProvider>
        <div className="chat-container">
          <ChatHeader />
          <MessageList />
          <QuickReplies />
          <ChatInputBar />
        </div>
      </ChatProvider>
    </DashboardLayout>
  );
};

export default ChatbotPage;
