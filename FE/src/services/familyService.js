import api from './api';

export const inviteFamily = (identifier) =>
  api.post('/family/invite', { identifier });

export const getFamilyMembers = () =>
  api.get('/family/members');

export const requestAccess = (identifier) =>
  api.post('/relations/request', { identifier });

export const approveRequest = (relationId, status) =>
  api.post('/relations/approve', { relation_id: relationId, status });

export const getPendingRequests = () =>
  api.get('/relations/pending');
