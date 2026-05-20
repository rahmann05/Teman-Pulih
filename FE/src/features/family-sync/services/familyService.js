import api from '@/shared/services/api';

export const inviteFamily = (identifier) =>
  api.post('/family/invite', { identifier });

export const getFamilyMembers = () =>
  api.get('/family/members');

export const requestAccess = (identifier) =>
  api.post('/relations/request', { identifier });

export const approveRequest = (relationId, status, verificationCode) =>
  api.post('/relations/approve', { relation_id: relationId, status, verification_code: verificationCode });

export const getPendingRequests = () =>
  api.get('/relations/pending');

export const createComplaint = (data) =>
  api.post('/family/complaints', data);

export const getComplaints = (patientId) =>
  api.get('/family/complaints', { params: { patientId } });

export const createCheckin = (data) =>
  api.post('/family/checkins', data);

export const getCheckins = (patientId, limit) =>
  api.get('/family/checkins', { params: { patientId, limit } });

export const getTodayCheckinStatus = () =>
  api.get('/family/checkins/today');

// Illness History
export const getIllnessHistory = (patientId) =>
  api.get('/illness', { params: { patientId } });

export const addIllness = (data) =>
  api.post('/illness', data);

export const markIllnessRecovered = (id) =>
  api.patch(`/illness/${id}/recover`);
