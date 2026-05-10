import api from './api';

/**
 * Medication Service Layer
 * All API calls related to medication schedules.
 */

/**
 * Fetch all medications for the current user (or a linked patient for caregivers).
 * @param {string} [patientId] - Optional patient ID for caregiver access.
 */
export const getMedications = (patientId) =>
  api.get('/medications', { params: patientId ? { patient_id: patientId } : {} });

/**
 * Create a new medication with schedules.
 * @param {object} data - { patient_id?, name, dosage, instructions, schedules[] }
 */
export const createMedication = (data) =>
  api.post('/medications', data);

/**
 * Update an existing medication's name, dosage, or instructions.
 * @param {string} id - Medication ID.
 * @param {object} data - { name?, dosage?, instructions? }
 */
export const updateMedication = (id, data) =>
  api.patch(`/medications/${id}`, data);

/**
 * Delete a medication by ID.
 * @param {string} id - Medication ID.
 */
export const deleteMedication = (id) =>
  api.delete(`/medications/${id}`);

/**
 * Log a dose status (taken / missed / skipped).
 * @param {string} id - Medication ID.
 * @param {object} body - { schedule_id?, status: 'taken'|'missed'|'skipped' }
 */
export const markTaken = (id, body) =>
  api.post(`/medications/${id}/taken`, body);

/**
 * Fetch all medication dose logs for the current user / patient.
 * @param {string} [patientId] - Optional patient ID for caregiver access.
 */
export const getMedicationLogs = (patientId) =>
  api.get('/medications/logs', { params: patientId ? { patient_id: patientId } : {} });
