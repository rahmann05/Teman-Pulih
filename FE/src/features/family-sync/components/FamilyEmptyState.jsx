import { LuUsers } from 'react-icons/lu';

const FamilyEmptyState = ({ message }) => (
  <div className="family-empty-state">
    <LuUsers size={32} className="family-empty-icon" />
    <p className="family-empty-text">{message}</p>
  </div>
);

export default FamilyEmptyState;
