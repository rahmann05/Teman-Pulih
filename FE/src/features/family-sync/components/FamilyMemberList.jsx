import FamilySectionHeader from '@/features/family-sync/components/FamilySectionHeader';
import FamilyEmptyState from '@/features/family-sync/components/FamilyEmptyState';
import FamilyMemberCard from '@/features/family-sync/components/FamilyMemberCard';

const FamilyMemberList = ({ title, members, emptyMessage }) => (
  <section className="family-section">
    <FamilySectionHeader title={title} count={members.length} />
    {members.length === 0 ? (
      <FamilyEmptyState message={emptyMessage} />
    ) : (
      <div className="family-member-list">
        {members.map((member) => (
          <FamilyMemberCard key={member.id} member={member} />
        ))}
      </div>
    )}
  </section>
);

export default FamilyMemberList;
