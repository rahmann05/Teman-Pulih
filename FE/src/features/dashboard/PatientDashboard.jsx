import React from 'react';
import { LuBell } from 'react-icons/lu';
import NextMedicationHero from '../../components/domain/NextMedicationHero';
import QuickActionGrid from '../../components/domain/QuickActionGrid';
import MedicationTimeline from '../../components/domain/MedicationTimeline';
import HealthTipsCarousel from '../../components/domain/HealthTipsCarousel';
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

const PatientDashboard = () => {
  return (
    <div className="dashboard-container" data-testid="patient-dashboard">
      <DashboardHeader userName="Budi Santoso" initials="BS" />
      <NextMedicationHero
        time="08:00 WIB"
        medName="Amoxicillin"
        instruction="500 mg - Sesudah makan"
      />
      <QuickActionGrid />
      <MedicationTimeline />
      <HealthTipsCarousel />
    </div>
  );
};

export default PatientDashboard;
