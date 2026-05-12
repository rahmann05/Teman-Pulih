import api from './api';

export const getProfile = () =>
  api.get('/profile');

export const updateProfile = (data) =>
  api.patch('/profile', data);

export const getFamilyMembers = () =>
  api.get('/family/members');
