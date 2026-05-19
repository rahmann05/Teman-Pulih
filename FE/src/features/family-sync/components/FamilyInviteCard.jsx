import { LuUserPlus } from 'react-icons/lu';
import FamilyInviteButton from '@/features/family-sync/components/FamilyInviteButton';
import FamilyInviteInput from '@/features/family-sync/components/FamilyInviteInput';

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
    <div>
      <div className="family-invite-title">
        <div className="family-invite-icon-wrapper">
          <LuUserPlus size={22} className="family-invite-title-icon" />
        </div>
        <span className="family-invite-title-text">{title}</span>
      </div>
      <p className="family-invite-desc">{description}</p>
    </div>

    <div>
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
    </div>
  </section>
);

export default FamilyInviteCard;
