import SideNav from './SideNav';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

const DashboardLayout = ({ children, caregiverMode = false }) => {
  return (
    <div className="app-main-wrapper">
      <TopNav caregiverMode={caregiverMode} />
      <SideNav caregiverMode={caregiverMode} />
      <main className="app-main">
        {children}
      </main>
      <BottomNav caregiverMode={caregiverMode} />
    </div>
  );
};

export default DashboardLayout;