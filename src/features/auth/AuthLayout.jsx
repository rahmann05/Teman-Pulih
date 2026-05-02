// src/features/auth/AuthLayout.jsx
import './Auth.css';
import heroImg from '../../assets/images/hero-recovery.png';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container" style={{ backgroundImage: `url(${heroImg})` }}>
      <div className="auth-overlay"></div>
      <main className="auth-card reveal visible">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
