import DashboardLayout from './DashboardLayout';

const FamilySyncLayout = ({ children, caregiverMode = false }) => (
  <DashboardLayout caregiverMode={caregiverMode}>
    <div className="family-container">
      {children}
    </div>
  </DashboardLayout>
);

export default FamilySyncLayout;
