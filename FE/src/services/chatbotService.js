import api from './api';

export const sendMessage = (message) =>
  api.post('/chatbot/message', { message });

export const getChatHistory = () =>
  api.get('/chatbot/history');

export const clearChatHistory = () =>
  api.delete('/chatbot/history');
