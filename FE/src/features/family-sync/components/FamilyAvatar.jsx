const FamilyAvatar = ({ initials, variant }) => (
  <div className={`family-member-avatar family-member-avatar--${variant}`}>
    {initials}
  </div>
);

export default FamilyAvatar;
