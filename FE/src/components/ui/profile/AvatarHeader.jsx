/* src/components/ui/profile/AvatarHeader.jsx */

const AvatarHeader = ({ initials, name, email, roleLabel, roleClassName }) => (
  <section className="profile-avatar-card">
    <div className="profile-avatar">{initials}</div>
    <div className="profile-name">{name}</div>
    <div className="profile-email">{email}</div>
    <span className={`profile-role-badge ${roleClassName}`}>{roleLabel}</span>
  </section>
);

export default AvatarHeader;
