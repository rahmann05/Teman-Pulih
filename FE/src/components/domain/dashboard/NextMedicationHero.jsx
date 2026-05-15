import { LuPill } from 'react-icons/lu';
import heroImg from '../../../assets/images/dashboard-hero-patient.png';

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
    <div className="dashboard-hero-wide" data-testid="next-med-hero">
      <div className="hero-wide-container">
        <img src={heroImg} alt="Patient" className="hero-wide-bg" />
        <div className="hero-wide-overlay">
          <div className="hero-content-top">
            <div className="hero-badge-pill">
              <LuPill />
              <span>PENGINGAT OBAT AKTIF</span>
            </div>
          </div>
          
          <div className="hero-content-bottom">
            <h2 className="hero-main-title">{medName}</h2>
            <p className="hero-main-subtitle">Jadwal berikutnya: {time} • {instruction}</p>
            
            {id && (
              <div className="hero-actions-overlay">
                <button
                  className="btn-glass-pill"
                  type="button"
                  onClick={() => onMarkTaken && onMarkTaken(id, medicationId, scheduleId)}
                >
                  Sudah Diminum →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextMedicationHero;
