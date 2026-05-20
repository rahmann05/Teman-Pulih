import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LuArrowLeft, 
  LuBell, 
  LuCheck, 
  LuTriangleAlert,
  LuRefreshCw
} from 'react-icons/lu';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import api from '@/shared/services/api';
import NotificationsEmptyState from '@/features/notifications/components/NotificationsEmptyState';
import '@/features/notifications/notifications.css';

/**
 * NotificationsPage - Displays user notifications dynamically
 */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const caregiverMode = user?.role === 'caregiver';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(caregiverMode ? '/caregiver/dashboard' : '/dashboard');
  };

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/notifications');
      if (response.data && response.data.data) {
        setNotifications(response.data.data);
      }
      setError(null);
    } catch (err) {
      console.error('[Notifications] Fetch error:', err.message);
      setError('Gagal memuat notifikasi. Silakan coba beberapa saat lagi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await api.patch('/notifications/read');
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err.message);
      fetchNotifications(false); // Rollback
    }
  };

  const markAsRead = async (id, isRead) => {
    if (isRead) return; // Already read
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('[Notifications] Mark single read error:', err.message);
      fetchNotifications(false); // Rollback
    }
  };

  // Fetch and poll
  useEffect(() => {
    fetchNotifications(true);

    // Poll every 10 seconds to keep the list instantly updated
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Format time relative to today/yesterday or exact date
  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / 86400000);

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      if (diffDays === 0 && date.getDate() === now.getDate()) {
        return `Hari ini pukul ${timeStr}`;
      } else if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
        return `Kemarin pukul ${timeStr}`;
      } else {
        const day = date.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = months[date.getMonth()];
        return `${day} ${month} pukul ${timeStr}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'reminder_10m':
      case 'reminder_exact':
        return <LuBell size={20} />;
      case 'caregiver_taken':
        return <LuCheck size={20} />;
      case 'caregiver_late':
      case 'patient_late':
        return <LuTriangleAlert size={20} />;
      default:
        return <LuBell size={20} />;
    }
  };

  return (
    <DashboardLayout caregiverMode={caregiverMode}>
      <div className="notifications-container" data-testid="notifications-page">
        <header className="notifications-header">
          <div className="notifications-title-area">
            <h1 className="notifications-page-title">Notifikasi</h1>
            <p className="notifications-page-subtitle">
              {caregiverMode 
                ? 'Informasi pengingat obat dan aktivitas terkini pasien Anda' 
                : 'Informasi pengingat obat dan aktivitas terkini Anda'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {notifications.some(n => !n.is_read) && (
              <button 
                onClick={markAllAsRead} 
                className="btn-secondary-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Tandai Semua Dibaca"
              >
                <LuCheck size={16} />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
            
            <button 
              onClick={handleBack} 
              className="notifications-back-btn" 
              title="Kembali"
            >
              <LuArrowLeft size={20} />
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <LuRefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : error ? (
          <div className="notifications-empty-card">
            <div className="notifications-empty-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <LuTriangleAlert size={32} />
            </div>
            <div className="notifications-empty-text-wrapper">
              <h3 className="notifications-empty-headline">Gagal Memuat Notifikasi</h3>
              <p className="notifications-empty-paragraph">{error}</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <NotificationsEmptyState />
        ) : (
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => markAsRead(notif.id, notif.is_read)}
                className={`notification-item ${!notif.is_read ? 'notification-item--unread' : ''}`}
              >
                {!notif.is_read && <div className="notification-unread-dot" />}
                
                <div className={`notification-icon-container notification-icon--${notif.type}`}>
                  {getNotificationIcon(notif.type)}
                </div>
                
                <div className="notification-content">
                  <h3 className="notification-item-title">{notif.title}</h3>
                  <p className="notification-item-message">{notif.message}</p>
                  <span className="notification-item-time">{formatTime(notif.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
