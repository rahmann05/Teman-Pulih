/* src/components/domain/DashboardHeader.jsx */
import { LuBell } from 'react-icons/lu';

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

export default DashboardHeader;
