/* src/hooks/useCaregiverDashboard.js */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';
import { getInitials, buildRoster, buildCaregiverTimeline as buildTimeline } from '../services/dashboardHelpers';

export const useCaregiverDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    loading: true,
    error: '',
    caregiverName: 'Caregiver',
    initials: 'CG',
    triageStatus: 'safe',
    triageMessage: 'Belum ada pasien yang terhubung.',
    roster: [],
    timeline: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [profileResponse, membersResponse] = await Promise.all([
          api.get('/profile'),
          api.get('/family/members'),
        ]);

        const relations = membersResponse.data?.members || [];
        const roster = buildRoster(relations);
        const primaryRelation = relations.find((relation) => relation.status === 'accepted') || relations[0];
        const primaryPatient = primaryRelation?.patient;
        const patientId = primaryPatient?.id;

        let medications = [];
        let logs = [];

        if (patientId) {
          const [medicationsResponse, logsResponse] = await Promise.all([
            api.get('/medications', { params: { patient_id: patientId } }),
            api.get('/medications/logs', { params: { patient_id: patientId } }),
          ]);

          medications = medicationsResponse.data?.data || [];
          logs = logsResponse.data?.data || [];
        }

        if (cancelled) return;

        const timeline = buildTimeline(medications, logs, primaryPatient?.name || 'Pasien');
        const latestMissedLog = logs.find((log) => log.status === 'missed');

        setDashboardData({
          loading: false,
          error: '',
          caregiverName: profileResponse.data?.profile?.name || user?.name || 'Caregiver',
          initials: getInitials(profileResponse.data?.profile?.name || user?.name || 'Teman Pulih'),
          triageStatus: latestMissedLog ? 'alert' : 'safe',
          triageMessage: latestMissedLog
            ? `${primaryPatient?.name || 'Pasien'} belum meminum ${latestMissedLog.medications?.name || 'obat'}${latestMissedLog.taken_at ? ` (${new Date(latestMissedLog.taken_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}`
            : primaryPatient
              ? `Semua jadwal ${primaryPatient.name} terpantau aman`
              : 'Belum ada pasien yang terhubung.',
          roster,
          timeline,
        });
      } catch (error) {
        if (cancelled) return;

        setDashboardData({
          loading: false,
          error: error.response?.data?.error || 'Gagal memuat dashboard caregiver.',
          caregiverName: user?.name || 'Caregiver',
          initials: getInitials(user?.name || 'Teman Pulih'),
          triageStatus: 'safe',
          triageMessage: 'Belum ada pasien yang terhubung.',
          roster: [],
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
