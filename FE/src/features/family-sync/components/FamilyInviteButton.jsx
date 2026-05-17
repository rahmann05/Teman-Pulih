import { LuSend } from 'react-icons/lu';

const FamilyInviteButton = ({ label, onClick, disabled }) => (
  <button
    type="button"
    className="family-invite-btn"
    onClick={onClick}
    disabled={disabled}
  >
    <LuSend size={18} />
    <span>{label}</span>
  </button>
);

export default FamilyInviteButton;
