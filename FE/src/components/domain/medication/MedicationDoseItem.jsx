import DoseStatusIcon from '../../ui/medication/DoseStatusIcon';

/**
 * MedicationDoseItem — single row in the today's dose timeline.
 * @param {string}   time       - e.g. "08:00"
 * @param {string}   status     - 'taken' | 'missed' | 'pending'
 * @param {string}   medId      - medication ID (for logging)
 * @param {string}   scheduleId - schedule ID (for logging)
 * @param {Function} onLog      - (medId, scheduleId, status) => void
 */
const MedicationDoseItem = ({ time, status = 'pending', medId, scheduleId, onLog }) => {
  return (
    <div className="med-dose-item" data-testid={`dose-item-${time}`}>
      <span className="med-dose-time">{time}</span>

      <DoseStatusIcon status={status} />

      {status === 'pending' && onLog && (
        <button
          className="med-dose-action-btn"
          type="button"
          aria-label={`Tandai ${time} sudah diminum`}
          onClick={() => onLog(medId, scheduleId, 'taken', time)}
        >
          Tandai Diminum
        </button>
      )}
    </div>
  );
};

export default MedicationDoseItem;
