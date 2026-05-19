import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LuBell } from 'react-icons/lu';
import api from '@/shared/services/api';

const CaregiverDashboardHeader = ({ userName, initials }) => {
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
        console.error('[CaregiverDashboardHeader Notifications Check Error]:', err.message);
      }
    };
    
    checkUnread();
    
    // Poll every 10 seconds to keep the bell badge extremely real-time
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="cg-dashboard-header" data-testid="cg-dashboard-header">
      <div className="cg-header-user-info">
        <div className="cg-avatar-circle">{initials}</div>
        <div className="cg-greeting-text">
          <span className="cg-greeting-sub">Halo,</span>
          <span className="cg-greeting-name">{userName}</span>
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
        <LuBell className="cg-bell-icon" data-testid="cg-bell-icon" />
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

export default CaregiverDashboardHeader;
