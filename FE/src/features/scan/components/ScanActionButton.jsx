/* src/components/ui/scan/ScanActionButton.jsx */

const ScanActionButton = ({ label, icon: Icon, onClick, disabled, variant = 'primary' }) => {
  const className = variant === 'primary' 
    ? 'scan-action-btn scan-action-btn--primary' 
    : 'scan-action-btn scan-action-btn--outline';

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {Icon && <Icon size={18} />}
      <span>{label}</span>
    </button>
  );
};

export default ScanActionButton;
