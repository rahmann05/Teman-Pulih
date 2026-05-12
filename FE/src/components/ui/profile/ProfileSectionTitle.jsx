const ProfileSectionTitle = ({ icon: Icon, title }) => (
  <div className="profile-section-title">
    {Icon && <Icon className="profile-section-title-icon" size={18} />}
    <span>{title}</span>
  </div>
);

export default ProfileSectionTitle;
