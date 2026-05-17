import { Link, useLocation } from 'react-router-dom';
import { LuHouse, LuScanLine, LuPill, LuMessageCircle, LuUser, LuUsers } from 'react-icons/lu';

const NAV_ITEMS = [
  { id: 'home',   label: 'Home',   icon: LuHouse,          path: '/dashboard' },
  { id: 'obat',   label: 'Obat',   icon: LuPill,           path: '/medications' },
  { id: 'scan',   label: 'Scan',   icon: LuScanLine,       path: '/scan' },
  { id: 'chat',   label: 'Chat',   icon: LuMessageCircle,  path: '/chatbot' },
  { id: 'family', label: 'Family', icon: LuUsers,          path: '/family-sync' },
  { id: 'profil', label: 'Profil', icon: LuUser,           path: '/profile' },
];

const BottomNav = ({ caregiverMode = false }) => {
  const { pathname } = useLocation();
  const homePath = caregiverMode ? '/caregiver/dashboard' : '/dashboard';

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/caregiver/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
        const active = isActive(path === '/dashboard' ? homePath : path);
        const isScan = id === 'scan';

        return (
          <Link
            key={id}
            to={path === '/dashboard' ? homePath : path}
            className={`bottom-nav-item${(id === 'scan' || id === 'chat') ? ' bottom-nav-highlight' : ''}${active && !(id === 'scan' || id === 'chat') ? ' active' : ''}`}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            {(id === 'scan' || id === 'chat') ? (
              <span className={`highlight-fab ${id}`} aria-hidden="true">
                <Icon size={22} />
              </span>
            ) : (
              <>
                <Icon
                  size={22}
                  className="bottom-nav-icon"
                  aria-hidden="true"
                />
                <span className="bottom-nav-label">{label}</span>
                {active && <span className="bottom-nav-dot" aria-hidden="true" />}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
