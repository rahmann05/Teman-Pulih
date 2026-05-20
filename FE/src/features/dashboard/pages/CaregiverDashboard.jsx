/* src/features/dashboard/pages/CaregiverDashboard.jsx */
import React from 'react';
import TriageHeroCard from '@/features/dashboard/components/TriageHeroCard';
import PatientMedicalProfileCard from '@/features/dashboard/components/PatientMedicalProfileCard';
import UpcomingTimeline from '@/features/dashboard/components/UpcomingTimeline';
import WeeklyMedicationCalendar from '@/features/dashboard/components/WeeklyMedicationCalendar';
import CaregiverDashboardHeader from '@/features/dashboard/components/CaregiverDashboardHeader';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { useCaregiverDashboard } from '@/features/dashboard/hooks/useCaregiverDashboard';
import PatientCheckinMonitoringCard from '@/features/dashboard/components/PatientCheckinMonitoringCard';
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
              acceptedPatients={dashboardData.acceptedPatients}
              activePatientId={dashboardData.activePatientId}
              activePatientName={dashboardData.activePatientName}
              activePatientProfile={dashboardData.activePatientProfile}
              switchPatient={dashboardData.switchPatient}
            />
          </div>

          {dashboardData.activePatientId ? (
            <>
              {/* Pemantauan Kondisi Pasien (Left Column) */}
              <div className="dashboard-col-left">
                <PatientCheckinMonitoringCard 
                  patientId={dashboardData.activePatientId} 
                  patientName={dashboardData.activePatientName}
                />
              </div>

              {/* Jadwal Pemantauan / Timeline (Right Column) */}
              <div className="dashboard-col-right">
                <UpcomingTimeline schedule={dashboardData.timeline} />
              </div>

              {/* Detail Pasien (Full Width Row - spans left to right, placed above calendar) */}
              <div className="dashboard-hero-wrapper">
                <PatientMedicalProfileCard 
                  activePatientProfile={dashboardData.activePatientProfile}
                  activePatientName={dashboardData.activePatientName}
                  loading={dashboardData.loadingPatientData}
                />
              </div>

              {/* Kalender Kepatuhan Mingguan (Full Width Row) */}
              <div className="dashboard-calendar-wrapper">
                <WeeklyMedicationCalendar 
                  medications={dashboardData.medications} 
                  logs={dashboardData.logs} 
                />
              </div>
            </>
          ) : (
            /* Beautiful Centered Empty State when no patient is active/connected */
            <div className="dashboard-hero-wrapper">
              <div className="bento-card" style={{ 
                textAlign: 'center', 
                padding: '64px var(--space-6)', 
                background: '#FFFFFF',
                borderRadius: '32px',
                border: '1px dashed var(--accent-light)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  margin: 0 
                }}>
                  Belum ada pasien aktif yang terhubung.
                </p>
                <p style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '14px', 
                  margin: 0,
                  maxWidth: '360px',
                  lineHeight: 1.5
                }}>
                  Silakan undang keluarga Anda menggunakan menu Hubungkan Keluarga agar dapat memantau aktivitas pemulihan mereka di sini.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default CaregiverDashboard;
