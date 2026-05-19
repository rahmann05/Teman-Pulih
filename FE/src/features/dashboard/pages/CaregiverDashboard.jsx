/* src/features/dashboard/pages/CaregiverDashboard.jsx */
import React from 'react';
import TriageHeroCard from '@/features/dashboard/components/TriageHeroCard';
import PatientRoster from '@/features/dashboard/components/PatientRoster';
import UpcomingTimeline from '@/features/dashboard/components/UpcomingTimeline';
import WeeklyMedicationCalendar from '@/features/dashboard/components/WeeklyMedicationCalendar';
import CaregiverDashboardHeader from '@/features/dashboard/components/CaregiverDashboardHeader';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { useCaregiverDashboard } from '@/features/dashboard/hooks/useCaregiverDashboard';
import '@/features/dashboard/dashboard.css';
import '@/features/dashboard/caregiver-dashboard.css';

const CaregiverDashboard = () => {
  const dashboardData = useCaregiverDashboard();

  if (dashboardData.loading) {
    return (
      <DashboardLayout caregiverMode>
        <div className="dashboard-container">
          <div className="dashboard-skeleton">
            <div className="skeleton-block" style={{ height: 56 }} />
            <div className="skeleton-block" style={{ height: 220 }} />
            <div className="skeleton-block" style={{ height: 148 }} />
            <div className="skeleton-block" style={{ height: 148 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (dashboardData.error) {
    return (
      <DashboardLayout caregiverMode>
        <div className="dashboard-container">
          <p style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {dashboardData.error}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout caregiverMode>
      <div className="dashboard-container" data-testid="caregiver-dashboard">
        
        {/* Mobile/Tablet Greeting (Hidden on Desktop, handled by TopNav) */}
        <CaregiverDashboardHeader userName={dashboardData.caregiverName} initials={dashboardData.initials} />

        {/* Dashboard Content Grid */}
        <div className="patient-dashboard-grid">
          
          {/* Triage Hero Section (Spans full width of the grid on desktop) */}
          <div className="dashboard-hero-wrapper">
            <TriageHeroCard
              status={dashboardData.triageStatus}
              message={dashboardData.triageMessage}
            />
          </div>

          {/* Column 1: Patient Roster */}
          <div className="dashboard-col-left">
            <PatientRoster patients={dashboardData.roster} />
          </div>

          {/* Column 2: Upcoming Timeline */}
          <div className="dashboard-col-right">
            <UpcomingTimeline schedule={dashboardData.timeline} />
          </div>

          {/* Full Width Calendar Section (At the very end, if a patient is connected) */}
          {dashboardData.roster && dashboardData.roster.length > 0 && (
            <div className="dashboard-calendar-wrapper">
              <WeeklyMedicationCalendar 
                medications={dashboardData.medications} 
                logs={dashboardData.logs} 
              />
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default CaregiverDashboard;
