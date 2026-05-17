/* src/components/domain/dashboard/MedicationNextCard.jsx */
import { LuPill } from 'react-icons/lu';

const MedicationNextCard = ({
  time,
  medName,
  instruction,
  id,
  medicationId,
  scheduleId,
  onMarkTaken,
}) => {
  return (
    <div className="medication-next-card" data-testid="med-next-card">
      <div className="med-card-content">
        <div className="med-card-header">
          <LuPill size={14} aria-hidden="true" />
          <span>Jadwal Berikutnya</span>
        </div>

        <div className="med-card-time">{time}</div>

        <div className="med-card-details">
          <h2 className="med-card-name">{medName}</h2>
          {instruction && <p className="med-card-instruction">{instruction}</p>}
        </div>

        {id && (
          <div className="med-card-action">
            <button
              className="btn-med-taken"
              type="button"
              onClick={() => onMarkTaken && onMarkTaken(id, medicationId, scheduleId)}
            >
              Sudah Diminum
            </button>
          </div>
        )}
      </div>

      <div className="med-card-image-slot">
        {/* Placeholder for future medication image */}
        <span className="med-card-placeholder">Gambar Obat (Placeholder)</span>
        {/* <img src={medImageUrl} alt={medName} className="med-card-img" /> */}
      </div>
    </div>
  );
};

export default MedicationNextCard;
