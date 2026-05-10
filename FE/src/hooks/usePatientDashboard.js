/* src/hooks/usePatientDashboard.js */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';
import { getInitials, buildPatientTimeline } from '../services/dashboardHelpers';

export const usePatientDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    loading: true,
    error: '',
    patientName: 'Pasien',
    initials: 'TP',
    nextMedication: null,
    timeline: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [profileResponse, medicationsResponse, logsResponse] = await Promise.all([
          api.get('/profile'),
          api.get('/medications'),
          api.get('/medications/logs'),
        ]);

        if (cancelled) return;

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
        if (cancelled) return;

        setDashboardData({
          loading: false,
          error: error.response?.data?.error || 'Gagal memuat dashboard pasien.',
          patientName: user?.name || 'Pasien',
          initials: getInitials(user?.name || 'Teman Pulih'),
          nextMedication: null,
          timeline: [],
        });
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user?.name]);

  return dashboardData;
};
