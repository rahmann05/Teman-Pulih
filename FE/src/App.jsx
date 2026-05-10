import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PatientDashboard from './features/dashboard/PatientDashboard';
import CaregiverDashboard from './features/dashboard/CaregiverDashboard';
import PageTransition from './components/layout/PageTransition';
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

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

        {/* Route Khusus Patient */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PageTransition><PatientDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Route Khusus Caregiver */}
        <Route
          path="/caregiver/dashboard"
          element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <PageTransition><CaregiverDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
