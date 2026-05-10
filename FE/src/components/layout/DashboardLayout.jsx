import SideNav from './SideNav';
import BottomNav from './BottomNav';

const DashboardLayout = ({ children, caregiverMode = false }) => {
  return (
    <div className="app-main-wrapper">
      <SideNav caregiverMode={caregiverMode} />
      <main className="app-main">
        {children}
      </main>
      {/* BottomNav is shown on mobile, hidden on desktop via CSS */}
      <BottomNav caregiverMode={caregiverMode} />
    </div>
  );
};

export default DashboardLayout;