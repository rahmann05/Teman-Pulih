/* src/features/dashboard/PatientDashboard.jsx */
import NextMedicationHero from '../../components/domain/dashboard/NextMedicationHero';
import QuickActionGrid from '../../components/domain/dashboard/QuickActionGrid';
import MedicationTimeline from '../../components/domain/medication/MedicationTimeline';
import HealthTipsCarousel from '../../components/domain/dashboard/HealthTipsCarousel';
import WeeklyMedicationCalendar from '../../components/domain/dashboard/WeeklyMedicationCalendar';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DashboardHeader from '../../components/domain/dashboard/DashboardHeader';
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
        <DashboardHeader userName={dashboardData.patientName} initials={dashboardData.initials} />
        
        <NextMedicationHero
          id={dashboardData.nextMedication?.id}
          medicationId={dashboardData.nextMedication?.medicationId}
          scheduleId={dashboardData.nextMedication?.scheduleId}
          time={dashboardData.nextMedication ? `${dashboardData.nextMedication.time} WIB` : 'Belum ada jadwal'}
          medName={dashboardData.nextMedication?.medName || 'Tidak ada obat terjadwal'}
          instruction={dashboardData.nextMedication?.instruction || 'Data jadwal belum tersedia'}
          onMarkTaken={dashboardData.markAsTakenAction}
        />

        <QuickActionGrid />

        <div className="dashboard-grid dashboard-grid--single">
          <div className="dashboard-main">
            <MedicationTimeline schedule={dashboardData.timeline} />
            <WeeklyMedicationCalendar />
          </div>
        </div>

        <HealthTipsCarousel />
      </div>

      <EMROnboardingModal 
        isOpen={!dashboardData.is_emr_completed} 
        onSuccess={() => window.location.reload()} 
      />
    </DashboardLayout>
  );
};

export default PatientDashboard;
