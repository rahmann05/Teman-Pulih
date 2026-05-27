import { LuSettings } from 'react-icons/lu';
import ProfileSectionTitle from '@/features/profile/components/ProfileSectionTitle';

const ProfileSettingsSection = ({ notificationsEnabled, onToggleNotifications, isForcedWa }) => (
  <section>
    <ProfileSectionTitle icon={LuSettings} title="Pengaturan" />

    <div className="profile-settings-card">
      <div className="profile-setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span className="profile-setting-label">Notifikasi WhatsApp</span>
          <button
            type="button"
            className={`profile-toggle${notificationsEnabled ? ' active' : ''}`}
            onClick={onToggleNotifications}
            disabled={isForcedWa}
            style={{ opacity: isForcedWa ? 0.5 : 1, cursor: isForcedWa ? 'not-allowed' : 'pointer' }}
            aria-pressed={notificationsEnabled}
            aria-label="Toggle notifikasi WhatsApp"
          />
        </div>
        {isForcedWa && (
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Berhubung skor Kepatuhan Anda berada di tingkat Menengah atau Butuh Intervensi, notifikasi WhatsApp diaktifkan secara wajib untuk memastikan pemulihan optimal Anda.
          </p>
        )}
      </div>
    </div>
  </section>
);

export default ProfileSettingsSection;
