import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/layout/PageTransition';
import { useAuth } from './hooks/useAuth';
import './styles/App.css';

// Lazy load feature pages
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const AuthCallback = lazy(() => import('./features/auth/AuthCallback'));
const PatientDashboard = lazy(() => import('./features/dashboard/PatientDashboard'));
const CaregiverDashboard = lazy(() => import('./features/dashboard/CaregiverDashboard'));
const ScanPage = lazy(() => import('./features/scan/ScanPage'));
const ScanCropPage = lazy(() => import('./features/scan/ScanCropPage'));
const ScanResultPage = lazy(() => import('./features/scan/ScanResultPage'));
const MedicationListPage = lazy(() => import('./features/medications/MedicationListPage'));
const MedicationDetailPage = lazy(() => import('./features/medications/MedicationDetailPage'));
const ChatbotPage = lazy(() => import('./features/chatbot/ChatbotPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-shimmer" />
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />

          {/* Route Khusus Patient */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><PatientDashboard /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ScanPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan/crop"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ScanCropPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan/result/:id"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ScanResultPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ChatbotPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Route Obat — Patient & Caregiver */}
          <Route
            path="/medications"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><MedicationListPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/medications/:id"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><MedicationDetailPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><ProfilePage /></PageTransition>
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
      </Suspense>
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
