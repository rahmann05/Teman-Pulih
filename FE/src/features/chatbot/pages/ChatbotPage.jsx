import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { ChatProvider } from '@/features/chatbot/context/ChatProvider';
import { ChatHeader } from '@/features/chatbot/components/ChatHeader';
import { MessageList } from '@/features/chatbot/components/MessageList';
import { QuickReplies } from '@/features/chatbot/components/QuickReplies';
import { ChatInputBar } from '@/features/chatbot/components/ChatInputBar';
import { useAuth } from '@/shared/hooks/useAuth';
import '@/features/chatbot/chatbot.css';

const ChatbotPage = () => {
  const { user } = useAuth();
  const caregiverMode = user?.role === 'caregiver';

  return (
    <DashboardLayout caregiverMode={caregiverMode}>
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
