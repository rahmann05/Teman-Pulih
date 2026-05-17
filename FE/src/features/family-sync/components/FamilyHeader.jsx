import { LuArrowLeft } from 'react-icons/lu';

const FamilyHeader = ({ title, onBack }) => (
  <header className="family-header">
    <button type="button" className="family-back-btn" onClick={onBack} aria-label="Kembali">
      <LuArrowLeft size={20} />
    </button>
    <h1 className="family-header-title">{title}</h1>
  </header>
);

export default FamilyHeader;
