import FamilyAvatar from '@/features/family-sync/components/FamilyAvatar';
import FamilyStatusBadge from '@/features/family-sync/components/FamilyStatusBadge';

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
