// src/features/auth/AuthToggle.jsx
const AuthToggle = ({ role, setRole }) => {
  return (
    <div className="auth-toggle">
      <button 
        className={role === 'pasien' ? 'active' : ''} 
        onClick={() => setRole('pasien')}
      >
        Pasien
      </button>
      <button 
        className={role === 'caregiver' ? 'active' : ''} 
        onClick={() => setRole('caregiver')}
      >
        Caregiver
      </button>
    </div>
  );
};

export default AuthToggle;
