/* src/components/ui/landing/ServiceChip.jsx */

const ServiceChip = ({ label, icon: Icon, active, onClick }) => {
  return (
    <button 
      className={`chip ${active ? 'active' : ''}`} 
      role="tab" 
      aria-selected={active}
      onClick={onClick}
    >
      {Icon && <Icon size={14} />} {label}
    </button>
  );
};

export default ServiceChip;
