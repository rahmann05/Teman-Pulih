import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/shared/components/PageTransition';
import { useAuth } from '@/shared/hooks/useAuth';
import '@/styles/app.css';

// Lazy load feature pages
const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const AuthCallback = lazy(() => import('@/features/auth/pages/AuthCallback'));
const PatientDashboard = lazy(() => import('@/features/dashboard/pages/PatientDashboard'));
const CaregiverDashboard = lazy(() => import('@/features/dashboard/pages/CaregiverDashboard'));
const ScanPage = lazy(() => import('@/features/scan/pages/ScanPage'));
const ScanCropPage = lazy(() => import('@/features/scan/pages/ScanCropPage'));
const ScanResultPage = lazy(() => import('@/features/scan/pages/ScanResultPage'));
const MedicationListPage = lazy(() => import('@/features/medications/pages/MedicationListPage'));
const CaregiverMedicationListPage = lazy(() => import('@/features/medications/pages/CaregiverMedicationListPage'));
const MedicationDetailPage = lazy(() => import('@/features/medications/pages/MedicationDetailPage'));
const ChatbotPage = lazy(() => import('@/features/chatbot/pages/ChatbotPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const FamilySyncPage = lazy(() => import('@/features/family-sync/pages/FamilySyncPage'));
const PelajariPage   = lazy(() => import('@/features/pelajari/pages/PelajariPage'));
const DirectChatPage = lazy(() => import('@/features/chat/pages/DirectChatPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const ComplianceAssessmentPage = lazy(() => import('@/features/compliance/pages/ComplianceAssessmentPage'));
const ComplianceResultPage = lazy(() => import('@/features/compliance/pages/ComplianceResultPage'));

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

const MedicationsRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'caregiver') {
    return <CaregiverMedicationListPage />;
  }
  return <MedicationListPage />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'caregiver') {
      document.body.classList.add('caregiver-theme');
    } else {
      document.body.classList.remove('caregiver-theme');
    }
  }, [user?.role]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pelajari" element={<PageTransition><PelajariPage /></PageTransition>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><ChatbotPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Route Kepatuhan — Patient */}
          <Route
            path="/compliance"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ComplianceAssessmentPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/result"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PageTransition><ComplianceResultPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* Route Obat — Patient & Caregiver */}
          <Route
            path="/medications"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><MedicationsRoute /></PageTransition>
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

          <Route
            path="/family-sync"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><FamilySyncPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><NotificationsPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:userId"
            element={
              <ProtectedRoute allowedRoles={['patient', 'caregiver']}>
                <PageTransition><DirectChatPage /></PageTransition>
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
