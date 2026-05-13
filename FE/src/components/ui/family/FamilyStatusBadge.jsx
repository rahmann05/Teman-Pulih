const FamilyStatusBadge = ({ label, variant }) => (
  <span className={`family-status-badge family-status-badge--${variant}`}>
    {label}
  </span>
);

export default FamilyStatusBadge;
