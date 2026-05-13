import { LuUserPlus } from 'react-icons/lu';
import FamilyInviteButton from '../../ui/family/FamilyInviteButton';
import FamilyInviteInput from '../../ui/family/FamilyInviteInput';

const FamilyInviteCard = ({
  title,
  description,
  placeholder,
  value,
  onChange,
  onSend,
  isSending,
  error,
  status,
  buttonLabel,
}) => (
  <section className="family-invite-card">
    <div className="family-invite-title">
      <LuUserPlus size={18} className="family-invite-title-icon" />
      <span>{title}</span>
    </div>
    <p className="family-invite-desc">{description}</p>

    <div className="family-invite-row">
      <FamilyInviteInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        hasError={Boolean(error)}
      />
      <FamilyInviteButton
        label={buttonLabel}
        onClick={onSend}
        disabled={isSending}
      />
    </div>

    {error && <div className="family-invite-error">{error}</div>}
    {status?.type === 'success' && (
      <div className="family-invite-success">{status.message}</div>
    )}
    {status?.type === 'error' && !error && (
      <div className="family-invite-error">{status.message}</div>
    )}
  </section>
);

export default FamilyInviteCard;
