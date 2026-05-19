/* src/components/layout/TopNav.jsx */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuHouse, LuScanLine, LuPill, LuMessageCircle, LuUser, LuHeartPulse, LuLogOut, LuArrowLeftRight, LuUsers, LuBell } from 'react-icons/lu';
import { useAuth } from '@/shared/hooks/useAuth';
import api from '@/shared/services/api';
import '@/shared/layouts/topnav.css';

const NAV_ITEMS = [
  { id: 'home',   label: 'Beranda',     icon: LuHouse,          path: '/dashboard' },
  { id: 'obat',   label: 'Jadwal Obat', icon: LuPill,           path: '/medications' },
  { id: 'scan',   label: 'Scan Obat',   icon: LuScanLine,       path: '/scan' },
  { id: 'chat',   label: 'Konsultasi',  icon: LuMessageCircle,  path: '/chatbot' },
  { id: 'family', label: 'Family Sync', icon: LuUsers,          path: '/family-sync' },
];

const TopNav = ({ caregiverMode = false }) => {
  const { pathname } = useLocation();
  const { user, logout, switchRole } = useAuth();
  const homePath = caregiverMode ? '/caregiver/dashboard' : '/dashboard';

  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await api.get('/notifications');
        if (res.data && res.data.data) {
          const unread = res.data.data.some(n => !n.is_read);
          setHasUnread(unread);
        }
      } catch (err) {
        console.error('[TopNav Notifications Check Error]:', err.message);
      }
    };
    
    checkUnread();
    
    // Poll every 10 seconds to keep the bell badge extremely real-time
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/caregiver/dashboard';
    return pathname.startsWith(path);
  };

  const handleRoleSwitch = () => {
    if (!user) return;
    const otherRole = user.role === 'patient' ? 'caregiver' : 'patient';
    switchRole(otherRole);
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'TP';

  return (
    <header className="topnav-desktop" aria-label="Desktop Top Navigation">
      <div className="topnav-container">
        <div className="topnav-left">
          <Link to={homePath} className="topnav-brand">
            <div className="logo-mark">
              <LuHeartPulse size={24} />
            </div>
            <span className="logo-text">Teman Pulih</span>
          </Link>
        </div>

        <nav className="topnav-menu">
          {(caregiverMode ? NAV_ITEMS.filter(item => item.id !== 'scan') : NAV_ITEMS).map(({ id, label, icon: Icon, path }) => {
            const active = isActive(path === '/dashboard' ? homePath : path);
            return (
              <Link
                key={id}
                to={path === '/dashboard' ? homePath : path}
                className={`topnav-item${active ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="topnav-right">
          <div className="topnav-actions">
            {user?.allowed_roles?.length > 1 && (
              <button onClick={handleRoleSwitch} className="topnav-action-btn" title="Tukar Mode">
                <LuArrowLeftRight size={18} />
                <span>Tukar Mode</span>
              </button>
            )}
            <Link to="/notifications" className="topnav-action-btn" title="Notifikasi" style={{ position: 'relative' }}>
              <LuBell size={18} />
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 6px #ef4444'
                }} />
              )}
            </Link>
          </div>

          <div className="topnav-divider" />

          <div className="topnav-user">
            <div className="user-info">
              <span className="user-greeting">Halo,</span>
              <span className="user-name">{user?.name || 'Pasien'}</span>
            </div>
            <Link to="/profile" className="user-avatar-btn" title="Profil Saya">
              <div className="topnav-avatar">{initials}</div>
            </Link>
            <button onClick={logout} className="logout-icon-btn" title="Keluar">
              <LuLogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;