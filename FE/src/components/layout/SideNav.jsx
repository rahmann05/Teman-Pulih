import { Link, useLocation } from 'react-router-dom';
import { LuHouse, LuScanLine, LuPill, LuMessageCircle, LuUser, LuHeartPulse, LuLogOut, LuArrowLeftRight } from 'react-icons/lu';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/features/SideNav.css';

const NAV_ITEMS = [
  { id: 'home',  label: 'Beranda',  icon: LuHouse,          path: '/dashboard' },
  { id: 'scan',  label: 'Scan Obat',  icon: LuScanLine,      path: '/scan' },
  { id: 'obat',  label: 'Jadwal Obat',  icon: LuPill,          path: '/medications' },
  { id: 'chat',  label: 'Konsultasi',  icon: LuMessageCircle, path: '/chatbot' },
];

const SideNav = ({ caregiverMode = false }) => {
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
    <aside className="sidenav-desktop" aria-label="Desktop Navigation">
      <div className="sidenav-top">
        <Link to={homePath} className="sidenav-brand">
          <div className="logo-mark">
            <LuHeartPulse size={24} />
          </div>
          <span className="logo-text">Teman Pulih</span>
        </Link>

        <div className="sidenav-menu">
          {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
            const active = isActive(path === '/dashboard' ? homePath : path);

            return (
              <Link
                key={id}
                to={path === '/dashboard' ? homePath : path}
                className={`sidenav-item${active ? ' active' : ''}`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} className="sidenav-icon" />
                <span className="sidenav-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="sidenav-bottom">
        {user?.allowed_roles?.length > 1 && (
          <button onClick={handleRoleSwitch} className="sidenav-action-btn" title="Tukar Role">
            <LuArrowLeftRight size={20} />
            <span className="sidenav-label">Tukar Mode</span>
          </button>
        )}

        <Link to="/profile" className={`sidenav-item${isActive('/profile') ? ' active' : ''}`}>
          <LuUser size={20} className="sidenav-icon" />
          <span className="sidenav-label">Profil</span>
        </Link>

        <button onClick={logout} className="sidenav-action-btn logout" title="Keluar">
          <LuLogOut size={20} />
          <span className="sidenav-label">Keluar</span>
        </button>
      </div>
    </aside>
  );
};

export default SideNav;
