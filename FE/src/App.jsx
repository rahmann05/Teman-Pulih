import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PatientDashboard from './features/dashboard/PatientDashboard';
import CaregiverDashboard from './features/dashboard/CaregiverDashboard';
import { useAuth } from './hooks/useAuth';
import './styles/App.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user?.token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <PatientDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/caregiver/dashboard"
          element={(
            <ProtectedRoute>
              <CaregiverDashboard />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
