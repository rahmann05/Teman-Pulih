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
          className={role === tab ? 'active' : ''}
          onClick={() => setRole(tab)}
          style={{ position: 'relative', zIndex: 1, outline: 'none', border: 'none' }}
        >
          {role === tab && (
            <motion.div
              layoutId="activeTabIndicator"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '99px',
                zIndex: -1,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <span style={{ 
            position: 'relative', 
            zIndex: 2, 
            color: role === tab ? 'var(--text)' : 'var(--text-secondary)',
            transition: 'color 0.2s'
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default AuthToggle;
