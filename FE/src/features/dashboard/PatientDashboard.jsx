/* src/features/dashboard/PatientDashboard.jsx */
import NextMedicationHero from '../../components/domain/dashboard/NextMedicationHero';
import QuickActionGrid from '../../components/domain/dashboard/QuickActionGrid';
import MedicationTimeline from '../../components/domain/medication/MedicationTimeline';
import WeeklyMedicationCalendar from '../../components/domain/dashboard/WeeklyMedicationCalendar';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EMROnboardingModal from '../../components/layout/EMROnboardingModal';
import { usePatientDashboard } from '../../hooks/usePatientDashboard';
import '../../styles/features/Dashboard.css';

const PatientDashboard = () => {
  const dashboardData = usePatientDashboard();

  if (dashboardData.loading) {
    return (
      <DashboardLayout>
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
      <DashboardLayout>
        <div className="dashboard-container">
          <p style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {dashboardData.error}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-container" data-testid="patient-dashboard">
        
        {/* Mobile/Tablet Greeting (Hidden on Desktop, handled by TopNav) */}
        <div className="dashboard-header">
          <div className="header-user-info">
            <div className="avatar-circle">{dashboardData.initials}</div>
            <div className="greeting-text">
              <span className="greeting-sub">Selamat pagi,</span>
              <span className="greeting-name">{dashboardData.patientName}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="patient-dashboard-grid">
          
          {/* Split-Bento Hero Section (Spans full width of the grid on desktop) */}
          <div className="dashboard-hero-wrapper">
            <NextMedicationHero
              id={dashboardData.nextMedication?.id}
              medicationId={dashboardData.nextMedication?.medicationId}
              scheduleId={dashboardData.nextMedication?.scheduleId}
              time={dashboardData.nextMedication ? `${dashboardData.nextMedication.time} WIB` : 'Belum ada'}
              medName={dashboardData.nextMedication?.medName || 'Tidak ada obat terjadwal'}
              instruction={dashboardData.nextMedication?.instruction || 'Data jadwal belum tersedia'}
              onMarkTaken={dashboardData.markAsTakenAction}
            />
          </div>

          {/* Column 1: Quick Actions */}
          <div className="dashboard-col-left">
            <QuickActionGrid />
          </div>

          {/* Column 2: Timeline */}
          <div className="dashboard-col-right">
            <MedicationTimeline schedule={dashboardData.timeline} />
          </div>

          {/* Full Width Calendar Section (At the very end) */}
          <div className="dashboard-calendar-wrapper">
            <WeeklyMedicationCalendar />
          </div>

        </div>
      </div>

      <EMROnboardingModal 
        isOpen={!dashboardData.is_emr_completed} 
        onSuccess={() => window.location.reload()} 
      />
    </DashboardLayout>
  );
};

export default PatientDashboard;
