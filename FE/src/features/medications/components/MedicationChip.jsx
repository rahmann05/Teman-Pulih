/* src/components/ui/medication/MedicationChip.jsx */

const MedicationChip = ({ label, active, onClick }) => (
  <button
    role="tab"
    aria-selected={active}
    className={`med-chip${active ? ' active' : ''}`}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

export default MedicationChip;
