import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PatientDashboard from './features/dashboard/PatientDashboard';
import CaregiverDashboard from './features/dashboard/CaregiverDashboard';       
import { useAuth } from './hooks/useAuth';
import './styles/App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    // Memeriksa local storage jika object user belum terisi
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    // Jika masih null tunggu sebentar sampai context di update
    return <div>Loading...</div>;
  }

  // Jika allowedRoles di passing, cegah user yang role-nya beda masuk
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
     // Arahkan ke dashboard yang sesuai rolenya
     return <Navigate to={user.role === 'caregiver' ? '/caregiver/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Route Khusus Patient */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Route Khusus Caregiver */}
        <Route
          path="/caregiver/dashboard"
          element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <CaregiverDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
