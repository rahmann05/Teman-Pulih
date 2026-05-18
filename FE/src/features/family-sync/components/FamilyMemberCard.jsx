import { useNavigate } from 'react-router-dom';
import FamilyAvatar from '@/features/family-sync/components/FamilyAvatar';
import FamilyStatusBadge from '@/features/family-sync/components/FamilyStatusBadge';

const FamilyMemberCard = ({ member }) => {
  const navigate = useNavigate();
  return (
    <div className="family-member-card">
      <FamilyAvatar initials={member.initials} variant={member.avatarVariant} />
      <div className="family-member-info" style={{ flex: 1 }}>
        <div className="family-member-name">{member.name}</div>
        <div className="family-member-role">{member.roleLine}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        <FamilyStatusBadge label={member.statusLabel} variant={member.statusVariant} />
        {member.statusVariant === 'active' && member.userId && (
          <button 
            className="btn btn-primary" 
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
            onClick={() => navigate(`/chat/${member.userId}`)}
          >
            Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default FamilyMemberCard;
