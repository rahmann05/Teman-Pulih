// src/features/auth/AuthToggle.jsx
import '../../../styles/features/Auth.css';

const AuthToggle = ({ role, setRole }) => {
  return (
    <div className="auth-toggle">
      <button
        type="button"
        className={role === 'pasien' ? 'active' : ''}
        onClick={() => setRole('pasien')}
      >
        Pasien
      </button>
      <button
        type="button"
        className={role === 'caregiver' ? 'active' : ''}
        onClick={() => setRole('caregiver')}
      >
        Caregiver
      </button>
    </div>
  );
};

export default AuthToggle;
