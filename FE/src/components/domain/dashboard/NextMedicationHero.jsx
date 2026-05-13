import { LuPill } from 'react-icons/lu';
import heroImg from '../../../assets/images/hero-recovery.png';
import HeroCard from '../../ui/HeroCard';

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
    <HeroCard backgroundImage={heroImg} testId="next-med-hero">
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
    </HeroCard>
  );
};

export default NextMedicationHero;
