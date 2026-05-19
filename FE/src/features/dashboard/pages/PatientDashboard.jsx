/* src/features/dashboard/PatientDashboard.jsx */
import NextMedicationHero from '@/features/dashboard/components/NextMedicationHero';
import QuickActionGrid from '@/features/dashboard/components/QuickActionGrid';
import MedicationTimeline from '@/features/medications/components/MedicationTimeline';
import WeeklyMedicationCalendar from '@/features/dashboard/components/WeeklyMedicationCalendar';
import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import EMROnboardingModal from '@/shared/layouts/EMROnboardingModal';
import { usePatientDashboard } from '@/features/dashboard/hooks/usePatientDashboard';
import DailyCheckinCard from '@/features/dashboard/components/DailyCheckinCard';
import '@/features/dashboard/dashboard.css';

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
        <DashboardHeader userName={dashboardData.patientName} initials={dashboardData.initials} />

        {/* Dashboard Content Grid */}
        <div className="patient-dashboard-grid">
          
          {/* Split-Bento Hero Section (Spans full width of the grid on desktop) */}
          <div className="dashboard-hero-wrapper">
            <NextMedicationHero
              id={dashboardData.nextMedication?.id}
              medicationId={dashboardData.nextMedication?.medicationId}
              scheduleId={dashboardData.nextMedication?.scheduleId}
              time={
                dashboardData.nextMedication
                  ? (dashboardData.nextMedication.isCompletedToday
                      ? dashboardData.nextMedication.time
                      : `${dashboardData.nextMedication.time} WIB`)
                  : 'Belum ada'
              }
              medName={dashboardData.nextMedication?.medName || 'Tidak ada obat terjadwal'}
              instruction={dashboardData.nextMedication?.instruction || 'Data jadwal belum tersedia'}
              onMarkTaken={dashboardData.markAsTakenAction}
              isCompletedToday={dashboardData.nextMedication?.isCompletedToday}
            />
          </div>

          {/* Column 1: Quick Actions */}
          <div className="dashboard-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <QuickActionGrid />
          </div>

          {/* Column 2: Timeline */}
          <div className="dashboard-col-right">
            <MedicationTimeline schedule={dashboardData.timeline} />
          </div>

          {/* Daily Check-in Card (Spans 2 columns before the calendar) */}
          <div className="dashboard-hero-wrapper" style={{ marginTop: '24px' }}>
            <DailyCheckinCard />
          </div>

          {/* Full Width Calendar Section (At the very end) */}
          <div className="dashboard-calendar-wrapper">
            <WeeklyMedicationCalendar medications={dashboardData.medications} logs={dashboardData.logs} />
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
