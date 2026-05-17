// src/components/layout/auth/AuthLayout.jsx
import { LuHeartPulse, LuArrowLeft } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../../styles/features/Auth.css';
import heroObjImg from '../../../assets/images/hero-medical-object.png'; // 3D object without background
import hero3DImg from '../../../assets/images/hero-medical-3d.png';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      {/* 
        Airy Editorial Split Layout 
        Left: Massive Typography + Floating 3D Object
        Right: Clean Bento Card Form
      */}
      <div className="auth-content-layout">
        
        {/* Top Left Logo (Always visible across all viewports) */}
        <div className="auth-branding-header">
          <Link to="/" className="auth-brand-logo">
            <div className="logo-mark">
              <LuHeartPulse size={18} />
            </div>
            <span className="logo-text">Teman Pulih</span>
          </Link>
        </div>

        {/* Left Side: Editorial Visual Display */}
        <div className="auth-visual-panel">

          {/* Main Visual Group (Mirrors Landing Page) */}
          <div className="auth-main-visual">
            
            {/* Massive Display Text */}
            <div className="auth-display-text">
              <span className="display-line">Teman</span>
              <span className="display-line">Pulih<span style={{ color: 'var(--accent)' }}>.</span></span>
            </div>

            {/* Floating 3D Asset */}
            <div className="auth-3d-wrapper">
              <img src={heroObjImg} alt="Teman Pulih 3D Asset Mobile" className="auth-3d-img auth-3d-img--mobile" />
              <img src={hero3DImg} alt="Teman Pulih 3D Asset Desktop" className="auth-3d-img auth-3d-img--desktop" />
            </div>

          </div>

        </div>

        {/* Right Side: Form Panel */}
        <div className="auth-form-panel">
          
          <Link to="/" className="auth-back-link">
            <LuArrowLeft size={18} />
            <span>Kembali</span>
          </Link>

          <motion.main 
            className="auth-bento-card"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20, 
              delay: 0.1 
            }}
          >
            {children}
          </motion.main>
          
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
