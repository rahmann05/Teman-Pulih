import FamilySectionHeader from '@/features/family-sync/components/FamilySectionHeader';
import FamilyEmptyState from '@/features/family-sync/components/FamilyEmptyState';
import FamilyMemberCard from '@/features/family-sync/components/FamilyMemberCard';

const FamilyMemberList = ({ title, members, emptyMessage }) => (
  <section className="family-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <FamilySectionHeader title={title} count={members.length} />
    {members.length === 0 ? (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FamilyEmptyState message={emptyMessage} />
      </div>
    ) : (
      <div className="family-member-list" style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {members.map((member) => (
          <FamilyMemberCard key={member.id} member={member} />
        ))}
      </div>
    )}
  </section>
);

export default FamilyMemberList;
