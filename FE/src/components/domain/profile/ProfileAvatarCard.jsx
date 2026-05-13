import AvatarHeader from '../../ui/profile/AvatarHeader';

const ProfileAvatarCard = ({ initials, name, email, roleLabel, roleClassName }) => (
  <AvatarHeader
    initials={initials}
    name={name}
    email={email}
    roleLabel={roleLabel}
    roleClassName={roleClassName}
  />
);

export default ProfileAvatarCard;
