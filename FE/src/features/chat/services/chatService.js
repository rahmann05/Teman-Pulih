import api from '@/shared/services/api';

export const getDirectMessages = async (otherUserId) => {
  const response = await api.get(`/chat/${otherUserId}`);
  return response.data;
};

export const sendDirectMessage = async (receiverId, content) => {
  const response = await api.post('/chat', { receiverId, content });
  return response.data;
};
