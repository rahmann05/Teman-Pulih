import api from '@/shared/services/api';

export const getProfile = (patientId) =>
  api.get('/profile', { params: { patientId } });

export const updateProfile = (data) =>
  api.patch('/profile', data);

