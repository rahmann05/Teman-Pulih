/* src/components/domain/CaregiverDashboardHeader.jsx */
import { LuBell } from 'react-icons/lu';

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

export default CaregiverDashboardHeader;
