/* src/hooks/usePatientDashboard.js */
import { useState, useEffect, useOptimistic, useTransition, useCallback } from 'react';
import { getProfile } from '@/features/profile/services/profileService';
import { getMedications, getMedicationLogs, markTaken } from '@/features/medications/services/medicationService';
import { useAuth } from '@/shared/hooks/useAuth';
import { getInitials, buildPatientTimeline } from '@/features/dashboard/utils/dashboardHelpers';

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
    medications: [],
    logs: [],
  });

  // Optimistic State
  const [optimisticTimeline, addOptimisticLog] = useOptimistic(
    dashboardData.timeline,
    (state, compositeId) => {
      // Mark the item as taken instead of filtering it out
      return state.map((item) =>
        item.id === compositeId
          ? { ...item, state: 'taken', isTaken: true }
          : item
      );
    }
  );

  const loadDashboard = useCallback(async () => {
    try {
      const [profileResponse, medicationsResponse, logsResponse] = await Promise.all([
        getProfile(),
        getMedications(),
        getMedicationLogs(),
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
        nextMedication: timeline.find((item) => !item.isTaken) || null,
        timeline,
        medications,
        logs,
        is_emr_completed: profile?.is_emr_completed ?? true // Default true if undefined to prevent blocking
      });
    } catch (error) {
      setDashboardData({
        loading: false,
        error: error.response?.data?.error || 'Gagal memuat dashboard pasien.',
        patientName: user?.name || 'Pasien',
        initials: getInitials(user?.name || 'Teman Pulih'),
        nextMedication: null,
        timeline: [],
        medications: [],
        logs: [],
        is_emr_completed: true // Prevent showing modal on error
      });
    }
  }, [user?.id, user?.name]); // Use ID for stability and name for linter completeness

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const markAsTakenAction = async (compositeId, medicationId, scheduleId) => {
    // Extract time_slot from compositeId (medicationId-scheduleId-timeSlot)
    const timeSlot = compositeId.split('-')[2];

    startTransition(async () => {
      addOptimisticLog(compositeId);
      try {
        await markTaken(medicationId, {
          schedule_id: scheduleId,
          time_slot: timeSlot,
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
  const untakenMedication = optimisticTimeline.find((item) => !item.isTaken);

  let nextMedication = null;
  if (untakenMedication) {
    nextMedication = untakenMedication;
  } else if (optimisticTimeline.length > 0) {
    // All medications have been taken today!
    nextMedication = {
      isCompletedToday: true,
      time: 'Selesai!',
      medName: 'Semua obat telah diminum!',
      instruction: 'Tetap konsisten untuk pemulihan yang optimal.'
    };
  }

  return {
    ...dashboardData,
    timeline: optimisticTimeline,
    nextMedication, // USE DERIVED VALUE
    markAsTakenAction,
    isLogging: isPending
  };
};
