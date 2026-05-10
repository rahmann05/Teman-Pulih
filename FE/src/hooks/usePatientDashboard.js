/* src/hooks/usePatientDashboard.js */
import { useState, useEffect, useOptimistic, useTransition, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';
import { getInitials, buildPatientTimeline } from '../services/dashboardHelpers';

export const usePatientDashboard = () => {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [dashboardData, setDashboardData] = useState({
    loading: true,
    error: '',
    patientName: 'Pasien',
    initials: 'TP',
    nextMedication: null,
    timeline: [],
  });

  // Optimistic State
  const [optimisticTimeline, addOptimisticLog] = useOptimistic(
    dashboardData.timeline,
    (state, compositeId) => {
      // Remove the item from the timeline once taken
      return state.filter((item) => item.id !== compositeId);
    }
  );

  const loadDashboard = useCallback(async () => {
    try {
      const [profileResponse, medicationsResponse, logsResponse] = await Promise.all([
        api.get('/profile'),
        api.get('/medications'),
        api.get('/medications/logs'),
      ]);

      const profile = profileResponse.data?.profile;
      const medications = medicationsResponse.data?.data || [];
      const logs = logsResponse.data?.data || [];
      const timeline = buildPatientTimeline(medications, logs);

      setDashboardData({
        loading: false,
        error: '',
        patientName: profile?.name || user?.name || 'Pasien',
        initials: getInitials(profile?.name || user?.name || 'Teman Pulih'),
        nextMedication: timeline[0] || null,
        timeline,
      });
    } catch (error) {
      setDashboardData({
        loading: false,
        error: error.response?.data?.error || 'Gagal memuat dashboard pasien.',
        patientName: user?.name || 'Pasien',
        initials: getInitials(user?.name || 'Teman Pulih'),
        nextMedication: null,
        timeline: [],
      });
    }
  }, [user?.id, user?.name]); // Use ID for stability and name for linter completeness

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const markAsTakenAction = async (compositeId, medicationId, scheduleId) => {
    startTransition(async () => {
      addOptimisticLog(compositeId);
      try {
        await api.post(`/medications/${medicationId}/taken`, {
          schedule_id: scheduleId,
          status: 'taken'
        });
        await loadDashboard(); // REFRESH ACTUAL STATE
      } catch (err) {
        console.error('Failed to log medication:', err);
        alert('Gagal mencatat obat. Periksa koneksi internet Anda.');
        // React handles the rollback automatically
      }
    });
  };

  // Derive nextMedication from the optimistic timeline
  const nextMedication = optimisticTimeline[0] || null;

  return {
    ...dashboardData,
    timeline: optimisticTimeline,
    nextMedication, // USE DERIVED VALUE
    markAsTakenAction,
    isLogging: isPending
  };
};
