import { Link, useLocation } from 'react-router-dom';
import { LuHouse, LuScanLine, LuPill, LuMessageCircle, LuUser, LuHeartPulse, LuLogOut, LuArrowLeftRight, LuUsers } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { id: 'home',  label: 'Home',  icon: LuHouse,          path: '/dashboard' },
  { id: 'scan',  label: 'Scan',  icon: LuScanLine,      path: '/scan' },
  { id: 'obat',  label: 'Obat',  icon: LuPill,          path: '/medications' },
  { id: 'chat',  label: 'Chat',  icon: LuMessageCircle, path: '/chatbot' },
  { id: 'family',  label: 'Family Sync',  icon: LuUsers, path: '/family-sync' },
];

const TopNav = ({ caregiverMode = false }) => {
  const { pathname } = useLocation();
  const { user, logout, switchRole } = useAuth();
  const homePath = caregiverMode ? '/caregiver/dashboard' : '/dashboard';

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/caregiver/dashboard';
    return pathname.startsWith(path);
  };

  const handleRoleSwitch = () => {
    if (!user) return;
    const otherRole = user.role === 'patient' ? 'caregiver' : 'patient';
    switchRole(otherRole);
  };

  return (
    <nav className="top-nav-desktop" aria-label="Desktop Navigation">
      <div className="top-nav-left">
        <Link to={homePath} className="top-nav-brand">
          <div className="logo-mark">
            <LuHeartPulse size={20} />
          </div>
          <span className="logo-text">Teman Pulih</span>
        </Link>
      </div>

      <div className="top-nav-center">
        {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
          const active = isActive(path === '/dashboard' ? homePath : path);

          return (
            <Link
              key={id}
              to={path === '/dashboard' ? homePath : path}
              className={`top-nav-item${active ? ' active' : ''}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} className="top-nav-icon" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="top-nav-right">
        {user?.allowed_roles?.length > 1 && (
          <button onClick={handleRoleSwitch} className="btn-ghost role-switch-btn" title="Tukar Role">
            <LuArrowLeftRight size={18} />
          </button>
        )}

        <Link to="/profile" className={`top-nav-item${isActive('/profile') ? ' active' : ''}`}>
          <LuUser size={18} className="top-nav-icon" />
          <span>Profil</span>
        </Link>

        <button onClick={logout} className="btn-ghost logout-btn" title="Keluar">
          <LuLogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default TopNav;