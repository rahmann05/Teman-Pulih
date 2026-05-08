// src/features/auth/AuthToggle.jsx
import { motion } from 'framer-motion';
import '../../../styles/features/Auth.css';

const AuthToggle = ({ role, setRole }) => {
  return (
    <div className="auth-toggle" style={{ position: 'relative' }}>
      {['pasien', 'caregiver'].map((tab) => (
        <button
          key={tab}
          type="button"
          className={role === tab ? 'active-tab' : ''}
          onClick={() => setRole(tab)}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {role === tab && (
            <motion.div
              layoutId="activeTabIndicator"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--bg-dark)',
                borderRadius: 'var(--radius-full)',
                zIndex: -1,
                boxShadow: 'var(--shadow-sm)'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 2, color: role === tab ? 'var(--text-inverse)' : 'var(--text-secondary)' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default AuthToggle;
