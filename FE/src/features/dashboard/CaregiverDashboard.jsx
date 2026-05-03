import React from 'react';
import { LuBell } from 'react-icons/lu';
import TriageHeroCard from '../../components/domain/TriageHeroCard';
import PatientRoster from '../../components/domain/PatientRoster';
import UpcomingTimeline from '../../components/domain/UpcomingTimeline';
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

const CaregiverDashboard = () => {
  const globalStatus = 'alert';
  const statusMessage = globalStatus === 'alert'
    ? 'Ayah belum meminum Amoxicillin (08:00)'
    : 'Semua pasien terpantau aman';

  return (
    <div className="cg-dashboard-container" data-testid="caregiver-dashboard">
      <CaregiverDashboardHeader userName="Caregiver Budi" initials="CB" />
      <TriageHeroCard status={globalStatus} message={statusMessage} />
      <PatientRoster />
      <UpcomingTimeline />
    </div>
  );
};

export default CaregiverDashboard;
