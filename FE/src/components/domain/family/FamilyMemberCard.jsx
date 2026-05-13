import FamilyAvatar from '../../ui/family/FamilyAvatar';
import FamilyStatusBadge from '../../ui/family/FamilyStatusBadge';

const FamilyMemberCard = ({ member }) => (
  <div className="family-member-card">
    <FamilyAvatar initials={member.initials} variant={member.avatarVariant} />
    <div className="family-member-info">
      <div className="family-member-name">{member.name}</div>
      <div className="family-member-role">{member.roleLine}</div>
    </div>
    <FamilyStatusBadge label={member.statusLabel} variant={member.statusVariant} />
  </div>
);

export default FamilyMemberCard;
