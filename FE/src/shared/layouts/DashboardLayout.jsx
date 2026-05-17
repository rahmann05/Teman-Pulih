import SideNav from '@/shared/layouts/SideNav';
import BottomNav from '@/shared/layouts/BottomNav';
import TopNav from '@/shared/layouts/TopNav';

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