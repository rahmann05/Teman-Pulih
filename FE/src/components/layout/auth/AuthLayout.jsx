// src/components/layout/auth/AuthLayout.jsx
import { LuHeartPulse, LuArrowLeft, LuShieldCheck, LuBell, LuCircleCheck } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import '../../../styles/features/Auth.css';
import heroImg from '../../../assets/images/hero-recovery.png';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container" style={{ '--auth-bg': `url(${heroImg})` }}>
      <div className="auth-bg-overlay"></div>

      <div className="auth-content-layout">
        {/* Left Side: Form Panel */}
        <div className="auth-form-panel">
          <Link to="/" className="auth-back-link">
            <LuArrowLeft size={18} />
            <span>Kembali ke Beranda</span>
          </Link>

          <main className="auth-card reveal visible">
            {children}
          </main>
        </div>

        {/* Right Side: Branding & Trust Elements (Hidden on Mobile) */}
        <div className="auth-branding-panel">
          <div className="auth-branding-header">
            <Link to="/" className="auth-brand-logo">
              <div className="logo-mark">
                <LuHeartPulse size={24} />
              </div>
              <span className="logo-text">Teman Pulih</span>
            </Link>
          </div>

          <div className="auth-trust-content">
            <div className="trust-main">
              <h2>Pulih lebih aman & terarah bersama pendamping digital.</h2>
              <p>Sistem terintegrasi untuk pasien dan keluarga. Pantau progres pemulihan dengan akurasi dan kemudahan.</p>
            </div>

            {/* Trust Badges */}
            <div className="trust-badges">
              <div className="trust-badge">
                <LuShieldCheck size={18} />
                <span>Enkripsi End-to-End</span>
              </div>
              <div className="trust-badge">
                <LuCircleCheck size={18} />
                <span>Terpercaya</span>
              </div>
            </div>

            {/* Floating Widget Mockup */}
            <div className="floating-widget reveal d2 visible">
              <div className="widget-icon">
                <LuBell size={20} />
              </div>
              <div className="widget-text">
                <strong>Pengingat Obat Aktif</strong>
                <span>Jadwal berikutnya: 12:00 WIB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
