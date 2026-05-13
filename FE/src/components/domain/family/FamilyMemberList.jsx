import FamilySectionHeader from '../../ui/family/FamilySectionHeader';
import FamilyEmptyState from './FamilyEmptyState';
import FamilyMemberCard from './FamilyMemberCard';

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
