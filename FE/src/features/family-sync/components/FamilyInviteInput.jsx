const FamilyInviteInput = ({ value, onChange, placeholder, hasError }) => (
  <input
    type="text"
    className={`family-invite-input${hasError ? ' error' : ''}`}
    placeholder={placeholder}
    aria-label={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

export default FamilyInviteInput;
