import { LuHeartPulse, LuUser, LuLogOut, LuArrowLeftRight } from 'react-icons/lu';
import '../../styles/features/Navbar.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { user, logout, switchRole } = useAuth();

  const handleRoleSwitch = () => {
    if (!user) return;
    const otherRole = user.role === 'patient' ? 'caregiver' : 'patient';
    switchRole(otherRole);
  };

  return (
    <nav className="nav" aria-label="Main">
      <div className="logo">
        <Link to="/">
          <div className="logo-mark">
            <LuHeartPulse size={18} />
          </div>
          <span className="logo-text">Teman Pulih</span>
        </Link>
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            {user.allowed_roles?.length > 1 && (
              <button onClick={handleRoleSwitch} className="btn-ghost" title={`Switch to ${user.role === 'patient' ? 'Caregiver' : 'Patient'}`}>
                <LuArrowLeftRight size={18} style={{ marginRight: 'var(--space-2)' }} />
                <span className="desktop-only">Tukar Role</span>
              </button>
            )}
            <Link to={user.role === 'caregiver' ? '/caregiver/dashboard' : '/dashboard'} className="btn-ghost">
              <LuUser size={18} style={{ marginRight: 'var(--space-2)' }} />
              <span>{user.name || 'Profil'}</span>
            </Link>
            <button onClick={logout} className="btn-solid" style={{ backgroundColor: '#dc2626' }}>
              <LuLogOut size={18} />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">Masuk</Link>
            <Link to="/register" className="btn-solid">Daftar</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
