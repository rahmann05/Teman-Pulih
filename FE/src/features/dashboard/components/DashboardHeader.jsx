import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LuBell } from 'react-icons/lu';
import api from '@/shared/services/api';

const DashboardHeader = ({ userName, initials }) => {
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
        console.error('[DashboardHeader Notifications Check Error]:', err.message);
      }
    };
    
    checkUnread();
    
    // Poll every 10 seconds to keep the bell badge extremely real-time
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dashboard-header" data-testid="dashboard-header">
      <div className="header-user-info">
        <div className="avatar-circle">{initials}</div>
        <div className="greeting-text">
          <span className="greeting-sub">Selamat pagi,</span>
          <span className="greeting-name">{userName}</span>
        </div>
      </div>
      <Link 
        to="/notifications" 
        style={{ 
          color: 'inherit', 
          display: 'flex', 
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <LuBell className="bell-icon" data-testid="bell-icon" />
        {hasUnread && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            boxShadow: '0 0 6px #ef4444'
          }} />
        )}
      </Link>
    </header>
  );
};

export default DashboardHeader;
