import React from 'react';
import { LuBell } from 'react-icons/lu';

/**
 * NotificationsEmptyState component.
 * Renders a premium, glassmorphic empty state card when there are no notifications.
 * Follows the Single Responsibility Principle by isolating the empty state presentation.
 */
const NotificationsEmptyState = () => {
  return (
    <div className="notifications-empty-card" data-testid="notifications-empty-card">
      <div className="notifications-empty-icon-wrapper">
        <LuBell size={36} />
      </div>
      <div className="notifications-empty-text-wrapper">
        <h3 className="notifications-empty-headline">Belum Ada Notifikasi</h3>
        <p className="notifications-empty-paragraph">
          Semua pemberitahuan penting seperti pengingat jadwal minum obat dan aktivitas keluarga akan muncul di sini saat waktunya tiba.
        </p>
      </div>
    </div>
  );
};

export default NotificationsEmptyState;
