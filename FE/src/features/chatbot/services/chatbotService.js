import api from '@/shared/services/api';

export const sendMessage = (message) =>
  api.post('/chatbot/message', { message });

export const getChatHistory = () =>
  api.get('/chatbot/history');

export const clearChatHistory = () =>
  api.delete('/chatbot/history');

/**
 * Stream a chatbot message using SSE (Server-Sent Events).
 * Returns a ReadableStream response for real-time token streaming.
 * @param {string} message - The user's message
 * @param {AbortSignal} [signal] - Optional abort signal for cancellation
 * @returns {Promise<Response>} Raw fetch Response with readable body stream
 */
export const streamMessage = async (message, signal) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const response = await fetch(`${apiUrl}/chatbot/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-active-role': localStorage.getItem('role'),
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Gagal mengirim pesan');
  }

  return response;
};
