import { useEffect, useState } from 'react';
import { LuBell } from 'react-icons/lu';
import NextMedicationHero from '../../components/domain/NextMedicationHero';
import QuickActionGrid from '../../components/domain/QuickActionGrid';
import MedicationTimeline from '../../components/domain/MedicationTimeline';
import HealthTipsCarousel from '../../components/domain/HealthTipsCarousel';
import BottomNav from '../../components/layout/BottomNav';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/features/Dashboard.css';

const DashboardHeader = ({ userName, initials }) => (
  <header className="dashboard-header" data-testid="dashboard-header">
    <div className="header-user-info">
      <div className="avatar-circle">{initials}</div>
      <div className="greeting-text">
        <span className="greeting-sub">Selamat pagi,</span>
        <span className="greeting-name">{userName}</span>
      </div>
    </div>
    <LuBell className="bell-icon" data-testid="bell-icon" />
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

const buildTimeline = (medications = [], logs = []) => {
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
          medName: medication.name,
          instruction: formatInstruction(medication),
          progress: `${takenCount}/${totalCount} diminum`,
          state: 'upcoming',
        });
        return;
      }

      timeSlots.forEach((time) => {
        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          time,
          medName: medication.name,
          instruction: formatInstruction(medication),
          progress: `${takenCount}/${totalCount} diminum`,
          state: 'upcoming',
        });
      });
    });
  });

  return items.sort((left, right) => toMinutes(left.time) - toMinutes(right.time))
    .map((item, index) => ({
      ...item,
      state: index === 0 ? 'next' : 'upcoming',
    }));
};

const PatientDashboard = () => {
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
        const timeline = buildTimeline(medications, logs);

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

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-skeleton">
          <div className="skeleton-block" style={{ height: 56 }} />
          <div className="skeleton-block" style={{ height: 220 }} />
          <div className="skeleton-block" style={{ height: 148 }} />
          <div className="skeleton-block" style={{ height: 148 }} />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="dashboard-container">
        <p style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {dashboardData.error}
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="dashboard-container" data-testid="patient-dashboard">
      <DashboardHeader userName={dashboardData.patientName} initials={dashboardData.initials} />
      <NextMedicationHero
        time={dashboardData.nextMedication ? `${dashboardData.nextMedication.time} WIB` : 'Belum ada jadwal'}
        medName={dashboardData.nextMedication?.medName || 'Tidak ada obat terjadwal'}
        instruction={dashboardData.nextMedication?.instruction || 'Data jadwal belum tersedia'}
      />
      <QuickActionGrid />
      <MedicationTimeline schedule={dashboardData.timeline} />
      <HealthTipsCarousel />
      <BottomNav />
    </div>
  );
};

export default PatientDashboard;
