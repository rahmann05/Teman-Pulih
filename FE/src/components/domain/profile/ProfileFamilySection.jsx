import { LuUsers } from 'react-icons/lu';
import ProfileSectionTitle from '../../ui/profile/ProfileSectionTitle';

const ProfileFamilySection = ({ members, emptyMessage }) => (
  <section>
    <ProfileSectionTitle icon={LuUsers} title="Keluarga Terhubung" />

    {members.length === 0 ? (
      <div className="profile-empty">{emptyMessage}</div>
    ) : (
      <div className="profile-family-list">
        {members.map((member) => (
          <div key={member.id} className="profile-family-card">
            <div className="profile-family-avatar">{member.initials}</div>
            <div className="profile-family-info">
              <div className="profile-family-name">{member.name}</div>
              <div className="profile-family-role">{member.roleLine}</div>
            </div>
            <span className={`profile-status-badge ${member.statusClass}`}>{member.statusLabel}</span>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default ProfileFamilySection;
