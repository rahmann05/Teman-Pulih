import { LuPill } from 'react-icons/lu';
import heroImg from '../../../assets/images/hero-recovery.png';

const NextMedicationHero = ({
  time,
  medName,
  instruction,
  id,
  medicationId,
  scheduleId,
  onMarkTaken
}) => {
  return (
    <div className="hero-card" data-testid="next-med-hero">
      <img
        src={heroImg}
        alt=""
        className="hero-card-bg"
        aria-hidden="true"
        loading="eager"
      />
      <div className="hero-card-overlay" />
      <div className="hero-card-body">
        <div className="hero-card-top">
          <span className="hero-label">
            <LuPill className="hero-icon" aria-hidden="true" />
            Pengingat Berikutnya
          </span>
          <span className="hero-time-badge">{time}</span>
        </div>
        <div className="hero-card-middle">
          <h2 className="med-name">{medName}</h2>
          <p className="med-instruction">{instruction}</p>
        </div>
        {id && (
          <button
            className="glass-btn"
            type="button"
            onClick={() => onMarkTaken && onMarkTaken(id, medicationId, scheduleId)}
          >
            Sudah Diminum
          </button>
        )}
      </div>
    </div>
  );
};

export default NextMedicationHero;
