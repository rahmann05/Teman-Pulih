import React, { useEffect, useState } from 'react';
import { LuBell } from 'react-icons/lu';
import TriageHeroCard from '../../components/domain/TriageHeroCard';
import PatientRoster from '../../components/domain/PatientRoster';
import UpcomingTimeline from '../../components/domain/UpcomingTimeline';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/features/CaregiverDashboard.css';

const CaregiverDashboardHeader = ({ userName, initials }) => (
  <header className="cg-dashboard-header" data-testid="cg-dashboard-header">
    <div className="cg-header-user-info">
      <div className="cg-avatar-circle">{initials}</div>
      <div className="cg-greeting-text">
        <span className="cg-greeting-sub">Halo,</span>
        <span className="cg-greeting-name">{userName}</span>
      </div>
    </div>
    <LuBell className="cg-bell-icon" data-testid="cg-bell-icon" />
  </header>
);

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const parseTimeSlots = (timeSlots) => {
  if (!timeSlots) return [];
  if (Array.isArray(timeSlots)) return timeSlots;
  return String(timeSlots)
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean);
};

const toMinutes = (time) => {
  const [hours = '0', minutes = '0'] = String(time).split(':');
  return Number(hours) * 60 + Number(minutes);
};

const formatInstruction = (medication) => {
  return [medication.dosage, medication.instructions]
    .filter(Boolean)
    .join(' - ') || 'Instruksi belum tersedia';
};

const buildTimeline = (medications = [], logs = [], patientName = '') => {
  const items = [];

  medications.forEach((medication) => {
    const schedules = medication.medication_schedules || [];
    schedules.forEach((schedule) => {
      const timeSlots = parseTimeSlots(schedule.time_slots);
      const takenCount = logs.filter((log) => log.schedule_id === schedule.id && log.status === 'taken').length;
      const totalCount = Math.max(timeSlots.length, 1);

      if (timeSlots.length === 0) {
        items.push({
          id: `${medication.id}-${schedule.id}`,
          time: 'Belum dijadwalkan',
          patient: patientName,
          name: medication.name,
          desc: formatInstruction(medication),
          progress: `${takenCount}/${totalCount} diminum`,
        });
        return;
      }

      timeSlots.forEach((time) => {
        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          time,
          patient: patientName,
          name: medication.name,
          desc: formatInstruction(medication),
          progress: `${takenCount}/${totalCount} diminum`,
        });
      });
    });
  });

  return items.sort((left, right) => toMinutes(left.time) - toMinutes(right.time));
};

const buildRoster = (relations = []) => {
  return relations
    .filter((relation) => relation.status !== 'rejected')
    .map((relation) => {
      const patient = relation.patient || {};
      const statusLabel = relation.status === 'accepted'
        ? 'Pantauan aktif'
        : relation.status === 'pending'
          ? 'Menunggu persetujuan'
          : 'Hubungan tidak aktif';

      return {
        id: relation.id,
        name: patient.name || 'Pasien tanpa nama',
        initials: getInitials(patient.name || 'Pasien'),
        status: relation.status === 'accepted' ? 'safe' : 'alert',
        adherence: statusLabel,
      };
    });
};

const CaregiverDashboard = () => {
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

  if (dashboardData.loading) {
    return <div className="cg-dashboard-container">Memuat dashboard caregiver...</div>;
  }

  if (dashboardData.error) {
    return <div className="cg-dashboard-container">{dashboardData.error}</div>;
  }

  return (
    <div className="cg-dashboard-container" data-testid="caregiver-dashboard">
      <CaregiverDashboardHeader userName={dashboardData.caregiverName} initials={dashboardData.initials} />
      <TriageHeroCard status={dashboardData.triageStatus} message={dashboardData.triageMessage} />
      <PatientRoster patients={dashboardData.roster} />
      <UpcomingTimeline schedule={dashboardData.timeline} />
    </div>
  );
};

export default CaregiverDashboard;
