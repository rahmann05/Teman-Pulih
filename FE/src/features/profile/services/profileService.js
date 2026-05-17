import api from '@/shared/services/api';

export const getProfile = () =>
  api.get('/profile');

export const updateProfile = (data) =>
  api.patch('/profile', data);

