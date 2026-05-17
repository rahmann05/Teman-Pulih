/* src/features/dashboard/CaregiverDashboard.jsx */
import TriageHeroCard from '../../components/domain/dashboard/TriageHeroCard';
import PatientRoster from '../../components/domain/dashboard/PatientRoster';
import UpcomingTimeline from '../../components/domain/dashboard/UpcomingTimeline';
import DashboardLayout from '../../components/layout/DashboardLayout';
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
        
        {/* Mobile Header */}
        <div className="cg-dashboard-header">
          <div className="cg-header-user-info">
            <div className="cg-avatar-circle">{dashboardData.initials}</div>
            <div className="cg-greeting-text">
              <span className="cg-greeting-sub">Caregiver</span>
              <span className="cg-greeting-name">{dashboardData.caregiverName}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Split Desktop Grid */}
        <div className="cg-dashboard-grid">
          
          {/* Left Column: Triage & Roster */}
          <div className="dashboard-col-left">
            <TriageHeroCard
              status={dashboardData.triageStatus}
              message={dashboardData.triageMessage}
            />
            <PatientRoster patients={dashboardData.roster} />
          </div>

          {/* Right Column: Upcoming Timeline */}
          <div className="dashboard-col-right">
            <UpcomingTimeline schedule={dashboardData.timeline} />
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CaregiverDashboard;
