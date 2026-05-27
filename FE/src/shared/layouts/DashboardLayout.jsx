import SideNav from '@/shared/layouts/SideNav';
import BottomNav from '@/shared/layouts/BottomNav';
import TopNav from '@/shared/layouts/TopNav';

const DashboardLayout = ({ children, caregiverMode = false, hideNavigation = false }) => {
  return (
    <div className={`app-main-wrapper ${hideNavigation ? 'navigation-hidden' : ''}`}>
      {!hideNavigation && <TopNav caregiverMode={caregiverMode} />}
      {!hideNavigation && <SideNav caregiverMode={caregiverMode} />}
      <main className="app-main">
        {children}
      </main>
      {!hideNavigation && <BottomNav caregiverMode={caregiverMode} />}
    </div>
  );
};

export default DashboardLayout;