import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  markTaken as markTakenApi,
  getMedicationLogs,
} from '../services/medicationService';

/**
 * Custom hook for the Medication Schedule feature.
 * Supports patient self-access and caregiver access via patientId.
 * @param {string} [patientId] - Optional patient ID for caregiver mode.
 */
export const useMedications = (patientId) => {
  const { user } = useAuth();

  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state: 'all' | 'today' | 'done'
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [medRes, logRes] = await Promise.all([
        getMedications(patientId),
        getMedicationLogs(patientId),
      ]);
      setMedications(medRes.data?.data || []);
      setLogs(logRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data obat.');
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- CRUD actions ---

  const addMedication = useCallback(async (data) => {
    const payload = patientId ? { ...data, patient_id: patientId } : data;
    await createMedication(payload);
    await fetchAll();
  }, [patientId, fetchAll]);

  const editMedication = useCallback(async (id, data) => {
    await updateMedication(id, data);
    await fetchAll();
  }, [fetchAll]);

  const removeMedication = useCallback(async (id) => {
    await deleteMedication(id);
    await fetchAll();
  }, [fetchAll]);

  const logDose = useCallback(async (medId, scheduleId, status) => {
    await markTakenApi(medId, { schedule_id: scheduleId, status });
    await fetchAll();
  }, [fetchAll]);

  // --- Derived filtered list ---

  const today = new Date().toISOString().split('T')[0];

  const filteredMedications = medications.filter((med) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'today') {
      return med.medication_schedules?.some((s) => {
        const start = s.start_date ? s.start_date.split('T')[0] : null;
        const end = s.end_date ? s.end_date.split('T')[0] : null;
        if (!start) return false;
        if (end) return today >= start && today <= end;
        return today >= start;
      });
    }
    if (activeFilter === 'done') {
      return med.medication_schedules?.every((s) => {
        const end = s.end_date ? s.end_date.split('T')[0] : null;
        return end && today > end;
      });
    }
    return true;
  });

  return {
    medications,
    filteredMedications,
    logs,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    fetchAll,
    addMedication,
    editMedication,
    removeMedication,
    logDose,
  };
};
