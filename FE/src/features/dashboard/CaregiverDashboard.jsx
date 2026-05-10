/* src/features/dashboard/CaregiverDashboard.jsx */
import TriageHeroCard from '../../components/domain/TriageHeroCard';
import PatientRoster from '../../components/domain/PatientRoster';
import UpcomingTimeline from '../../components/domain/UpcomingTimeline';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CaregiverDashboardHeader from '../../components/domain/CaregiverDashboardHeader';
import { useCaregiverDashboard } from '../../hooks/useCaregiverDashboard';
import '../../styles/features/CaregiverDashboard.css';

const CaregiverDashboard = () => {
  const dashboardData = useCaregiverDashboard();

  if (dashboardData.loading) {
    return (
      <DashboardLayout caregiverMode>
        <div className="cg-dashboard-container">
          <div className="dashboard-skeleton">
            <div className="skeleton-block" style={{ height: 56 }} />
            <div className="skeleton-block" style={{ height: 200 }} />
            <div className="skeleton-block" style={{ height: 120 }} />
            <div className="skeleton-block" style={{ height: 160 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (dashboardData.error) {
    return (
      <DashboardLayout caregiverMode>
        <div className="cg-dashboard-container">
          <p style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {dashboardData.error}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout caregiverMode>
      <div className="cg-dashboard-container" data-testid="caregiver-dashboard">
        <CaregiverDashboardHeader 
          userName={dashboardData.caregiverName} 
          initials={dashboardData.initials} 
        />
        <div className="cg-dashboard-grid">
          <div className="cg-dashboard-main">
            <TriageHeroCard 
              status={dashboardData.triageStatus} 
              message={dashboardData.triageMessage} 
            />
            <PatientRoster patients={dashboardData.roster} />
          </div>
          <div className="cg-dashboard-aside">
            <UpcomingTimeline schedule={dashboardData.timeline} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CaregiverDashboard;
