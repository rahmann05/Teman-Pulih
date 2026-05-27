import api from '@/shared/services/api';

/**
 * Compliance Service Layer (Frontend)
 */

/**
 * Cek eligibility pasien (cooldown 1 minggu dan prefill data)
 * @param {string} [patientId] - Opsional (dipakai oleh caregiver atau admin)
 */
export const getEligibility = (patientId) => 
  api.get('/compliance/eligibility', { params: patientId ? { patient_id: patientId } : {} });

/**
 * Submit jawaban kuesioner kepatuhan pasien
 * @param {object} data - { patient_id?, formData }
 */
export const submitAssessment = (data) =>
  api.post('/compliance/assess', data);

/**
 * Mengambil seluruh riwayat pengujian kepatuhan
 * @param {string} [patientId] - Opsional
 */
export const getHistory = (patientId) =>
  api.get('/compliance/history', { params: patientId ? { patient_id: patientId } : {} });

/**
 * Mengambil hasil pengujian kepatuhan terbaru pasien
 * @param {string} [patientId] - Opsional
 */
export const getLatest = (patientId) =>
  api.get('/compliance/latest', { params: patientId ? { patient_id: patientId } : {} });
