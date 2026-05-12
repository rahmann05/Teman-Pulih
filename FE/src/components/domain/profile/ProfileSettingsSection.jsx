import { LuSettings } from 'react-icons/lu';
import ProfileSectionTitle from '../../ui/profile/ProfileSectionTitle';

const ProfileSettingsSection = ({ notificationsEnabled, onToggleNotifications }) => (
  <section>
    <ProfileSectionTitle icon={LuSettings} title="Pengaturan" />

    <div className="profile-settings-card">
      <div className="profile-setting-item">
        <span className="profile-setting-label">Notifikasi</span>
        <button
          type="button"
          className={`profile-toggle${notificationsEnabled ? ' active' : ''}`}
          onClick={onToggleNotifications}
          aria-pressed={notificationsEnabled}
          aria-label="Toggle notifikasi"
        />
      </div>
    </div>
  </section>
);

export default ProfileSettingsSection;
