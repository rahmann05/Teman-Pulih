import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeRole = localStorage.getItem('role');
  if (activeRole) config.headers['x-active-role'] = activeRole;
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (
      err.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('[API] Access token expired. Attempting silent refresh to clear chat history...');
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const refreshRes = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken });
          
          if (refreshRes.status === 200 && refreshRes.data.token) {
            const { token: newToken, refresh_token: newRefreshToken } = refreshRes.data;
            console.log('[API] Refresh token success. Deleting chat history...');
            
            // Save new tokens
            localStorage.setItem('token', newToken);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }
            
            // Call the delete chatbot history endpoint using the new access token
            await axios.delete(`${baseURL}/chatbot/history`, {
              headers: {
                Authorization: `Bearer ${newToken}`,
                'x-active-role': localStorage.getItem('role') || 'patient'
              }
            });
            console.log('[API] Chatbot history successfully cleared after token refresh.');
          }
        } catch (refreshErr) {
          console.error('[API] Failed to refresh token or clear history on 401:', refreshErr);
        }
      }
      
      // Clean up local storage and force logout redirect
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('allowed_roles');
      localStorage.removeItem('user_data');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
